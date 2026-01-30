from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company, AuditLog
from unittest.mock import patch

User = get_user_model()

class AccountSignalsTest(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Corp", slug="test-corp")

    @patch('apps.accounts.tasks.send_welcome_email.delay')
    def test_user_creation_triggers_audit_and_email(self, mock_task):
        # Create user
        user = User.objects.create_user(
            username="newuser",
            email="new@test.com",
            password="pwd",
            company=self.company
        )

        # Check AuditLog
        log = AuditLog.all_objects.filter(resource='User', resource_id=str(user.id)).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.company, self.company)
        
        # Check Celery Task
        # Note: on_commit usually requires TransactionTestCase or special handling in tests
        # Standard TestCase wraps everything in a transaction that rolls back, so on_commit hooks might not fire
        # unless we force it or use captureOnCommitCallbacks (Django 3.2+)
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
             User.objects.create_user(
                username="commit_user",
                email="c@test.com",
                password="pwd",
                company=self.company
            )
        
        self.assertTrue(mock_task.called)
