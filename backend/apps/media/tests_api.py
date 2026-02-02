from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from apps.core.models import Company

User = get_user_model()

class MediaAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Media Corp", slug="media-corp")
        self.user = User.all_objects.create_user(
            username="mediauser",
            email="m@corp.com",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='media-corp')

    def test_upload_and_filter_by_tenant(self):
        content = b"hello world"
        upload = SimpleUploadedFile("hello.txt", content, content_type="text/plain")
        res = self.client.post('/api/media/', {"file": upload, "title": "Hello"}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['title'], "Hello")

        list_res = self.client.get('/api/media/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(list_res.data['results']) >= 1)
