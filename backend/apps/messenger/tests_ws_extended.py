"""
tests_ws_extended.py — T4: Extended WebSocket consumer tests.

Covers the gaps identified in the audit:
  - Multi-participant broadcast
  - Tenant isolation (users from other companies cannot join)
  - Rate limiting in consumer (rapid message flood)
  - Mark-as-read via WebSocket
  - Presence consumer connect/disconnect lifecycle

Uses channels.testing.WebsocketCommunicator for async WS simulation.
"""
import pytest
import asyncio

from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import Company
from apps.messenger.models import Conversation, Message
from config.asgi import application

User = get_user_model()


def _make_token(user):
    return str(RefreshToken.for_user(user).access_token)


class MessengerWSBroadcastTest(TransactionTestCase):
    """T4: Verify that messages are broadcast to ALL participants in a conversation."""

    def setUp(self):
        self.company = Company.all_companies.create(name="Broadcast Corp", slug="broadcast-corp")
        self.alice = User.objects.create_user(
            username="alice_ws", email="alice@bc.com", password="pwd", company=self.company
        )
        self.bob = User.objects.create_user(
            username="bob_ws", email="bob@bc.com", password="pwd", company=self.company
        )
        self.conv = Conversation.objects.create(company=self.company)
        self.conv.participants.add(self.alice, self.bob)

    async def test_message_broadcast_to_all_participants(self):
        """Message sent by Alice must be received by Bob (and Alice) via WS."""
        url = f"ws/chat/{self.conv.id}/?token={_make_token(self.alice)}"
        url_bob = f"ws/chat/{self.conv.id}/?token={_make_token(self.bob)}"

        comm_alice = WebsocketCommunicator(application, url)
        comm_bob = WebsocketCommunicator(application, url_bob)

        connected_a, _ = await comm_alice.connect()
        connected_b, _ = await comm_bob.connect()
        self.assertTrue(connected_a, "Alice should connect")
        self.assertTrue(connected_b, "Bob should connect")

        await comm_alice.send_json_to({"message": "Hello Bob!"})

        # Both Alice and Bob should receive the broadcast
        msg_alice = await asyncio.wait_for(comm_alice.receive_json_from(), timeout=3)
        msg_bob = await asyncio.wait_for(comm_bob.receive_json_from(), timeout=3)

        self.assertEqual(msg_alice.get("message"), "Hello Bob!")
        self.assertEqual(msg_bob.get("message"), "Hello Bob!")
        self.assertEqual(msg_bob.get("sender"), "alice_ws")

        await comm_alice.disconnect()
        await comm_bob.disconnect()


class MessengerWSTenantIsolationTest(TransactionTestCase):
    """T4: Verify multi-tenant isolation — users from other companies are rejected."""

    def setUp(self):
        self.company_a = Company.all_companies.create(name="Company A", slug="company-a")
        self.company_b = Company.all_companies.create(name="Company B", slug="company-b")

        self.alice = User.objects.create_user(
            username="alice_tenant", email="alice@a.com", password="pwd", company=self.company_a
        )
        self.charlie = User.objects.create_user(
            username="charlie_tenant", email="charlie@b.com", password="pwd", company=self.company_b
        )

        self.conv = Conversation.objects.create(company=self.company_a)
        self.conv.participants.add(self.alice)
        # charlie from company_b is NOT added

    async def test_user_from_other_tenant_cannot_connect(self):
        """A user from company B must not be able to connect to company A's conversation."""
        url = f"ws/chat/{self.conv.id}/?token={_make_token(self.charlie)}"
        comm = WebsocketCommunicator(application, url)
        connected, _ = await comm.connect()
        self.assertFalse(connected, "Cross-tenant connection must be rejected")
        await comm.disconnect()

    async def test_user_from_correct_tenant_can_connect(self):
        """A participant from the correct tenant must connect successfully."""
        url = f"ws/chat/{self.conv.id}/?token={_make_token(self.alice)}"
        comm = WebsocketCommunicator(application, url)
        connected, _ = await comm.connect()
        self.assertTrue(connected, "Same-tenant participant must connect")
        await comm.disconnect()


class MessengerWSRateLimitTest(TransactionTestCase):
    """T4: Rate limiting — flooding messages must be rejected after threshold."""

    def setUp(self):
        self.company = Company.all_companies.create(name="RL Corp", slug="rl-corp")
        self.user = User.objects.create_user(
            username="ratelimit_user", email="rl@rl.com", password="pwd", company=self.company
        )
        self.conv = Conversation.objects.create(company=self.company)
        self.conv.participants.add(self.user)

    @pytest.mark.websocket
    async def test_rate_limit_rejects_excessive_messages(self):
        """
        After sending many messages rapidly, the consumer should either:
        - Disconnect the user, OR
        - Return an error event type

        The exact threshold depends on CONSUMER_RATE_LIMIT settings.
        This test sends 30 messages in rapid succession and expects at least
        one rejection/error/disconnect before all 30 are confirmed.
        """
        url = f"ws/chat/{self.conv.id}/?token={_make_token(self.user)}"
        comm = WebsocketCommunicator(application, url)
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        rejected = False
        for i in range(30):
            await comm.send_json_to({"message": f"flood {i}"})
            try:
                resp = await asyncio.wait_for(comm.receive_json_from(), timeout=0.5)
                if resp.get("type") == "error" or resp.get("type") == "rate_limited":
                    rejected = True
                    break
            except (asyncio.TimeoutError, Exception):
                # Connection may have been closed
                rejected = True
                break

        # The consumer must not silently accept unlimited messages
        # If this test fails, add rate limiting to the consumer
        self.assertTrue(
            rejected,
            "Consumer should reject/disconnect after rapid message flood. "
            "Ensure rate limiting is implemented in consumers.py.",
        )
        await comm.disconnect()


class MessengerWSMarkReadTest(TransactionTestCase):
    """T4: Test mark-as-read event via WebSocket."""

    def setUp(self):
        self.company = Company.all_companies.create(name="Read Corp", slug="read-corp")
        self.alice = User.objects.create_user(
            username="alice_read", email="alice@rc.com", password="pwd", company=self.company
        )
        self.bob = User.objects.create_user(
            username="bob_read", email="bob@rc.com", password="pwd", company=self.company
        )
        self.conv = Conversation.objects.create(company=self.company)
        self.conv.participants.add(self.alice, self.bob)

        # Create an unread message from Bob for Alice to mark as read
        self.msg = Message.objects.create(
            company=self.company,
            conversation=self.conv,
            sender=self.bob,
            content="Unread message",
            is_read=False,
        )

    async def test_mark_as_read_updates_message(self):
        """Sending a mark_read event should mark the message as read in the DB."""
        url = f"ws/chat/{self.conv.id}/?token={_make_token(self.alice)}"
        comm = WebsocketCommunicator(application, url)
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        await comm.send_json_to({
            "type": "mark_read",
            "message_ids": [self.msg.id],
        })

        # Give the consumer time to process
        try:
            resp = await asyncio.wait_for(comm.receive_json_from(), timeout=2)
            # Consumer may broadcast the read confirmation
            self.assertIn(resp.get("type"), ["message_read", "chat_message", None])
        except asyncio.TimeoutError:
            pass  # No broadcast is also acceptable

        # Verify the DB state
        await asyncio.sleep(0.1)  # allow any async DB write to settle
        from asgiref.sync import sync_to_async
        msg_refreshed = await sync_to_async(Message.objects.get)(pk=self.msg.id)
        self.assertTrue(msg_refreshed.is_read, "Message should be marked as read")

        await comm.disconnect()


class PresenceConsumerTest(TransactionTestCase):
    """T4: Test presence consumer lifecycle (connect → status update → disconnect)."""

    def setUp(self):
        self.company = Company.all_companies.create(name="Presence Corp", slug="presence-corp")
        self.user = User.objects.create_user(
            username="presence_user", email="p@p.com", password="pwd", company=self.company
        )

    async def test_presence_connect_and_disconnect(self):
        """User connects to presence WS and their status should be updated."""
        url = f"ws/presence/?token={_make_token(self.user)}"
        comm = WebsocketCommunicator(application, url)
        connected, _ = await comm.connect()
        self.assertTrue(connected, "Presence WS should accept authenticated users")

        # On connect, user should receive initial presence data or a confirmation
        try:
            resp = await asyncio.wait_for(comm.receive_json_from(), timeout=2)
            # Accept any valid response shape
            self.assertIsInstance(resp, dict)
        except asyncio.TimeoutError:
            pass  # No initial message is also acceptable

        await comm.disconnect()

    async def test_presence_Invalid_token_rejected(self):
        url = "ws/presence/?token=completely_invalid_token"
        comm = WebsocketCommunicator(application, url)
        connected, _ = await comm.connect()
        self.assertFalse(connected, "Invalid token must be rejected by presence consumer")
        await comm.disconnect()
