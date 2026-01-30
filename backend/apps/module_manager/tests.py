from django.test import TestCase, RequestFactory
from rest_framework.views import APIView
from apps.core.models import Company
from apps.accounts.models import User
from .models import Module, TenantModule
from .permissions import HasModuleAccess

class MockView(APIView):
    pass

class ModulePermissionTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = HasModuleAccess()
        
        # Setup Company and User
        self.company = Company.objects.create(name="Test Corp", slug="test-corp")
        self.user = User.objects.create_user(
            username="testuser", 
            password="password", 
            company=self.company
        )
        
        # Setup Module
        self.module = Module.objects.create(code="test_mod", name="Test Module")

    def test_no_module_code_defined(self):
        """Should allow access if view has no module_code defined"""
        request = self.factory.get('/')
        request.user = self.user
        request.company = self.company
        
        view = MockView()
        # view.module_code is undefined
        
        self.assertTrue(self.permission.has_permission(request, view))

    def test_no_company_context(self):
        """Should deny access if no company context (e.g. public endpoint trying to access module logic)"""
        request = self.factory.get('/')
        request.user = self.user
        request.company = None # Simulate missing context
        
        view = MockView()
        view.module_code = "test_mod"
        
        self.assertFalse(self.permission.has_permission(request, view))

    def test_module_not_assigned(self):
        """Should deny access if tenant does not have the module assigned"""
        request = self.factory.get('/')
        request.user = self.user
        request.company = self.company
        
        view = MockView()
        view.module_code = "test_mod"
        
        self.assertFalse(self.permission.has_permission(request, view))

    def test_module_assigned_but_inactive(self):
        """Should deny access if tenant has module but is_active=False"""
        TenantModule.objects.create(
            company=self.company, 
            module=self.module, 
            is_active=False
        )
        
        request = self.factory.get('/')
        request.user = self.user
        request.company = self.company
        
        view = MockView()
        view.module_code = "test_mod"
        
        self.assertFalse(self.permission.has_permission(request, view))

    def test_module_assigned_and_active(self):
        """Should allow access if tenant has module active"""
        TenantModule.objects.create(
            company=self.company, 
            module=self.module, 
            is_active=True
        )
        
        request = self.factory.get('/')
        request.user = self.user
        request.company = self.company
        
        view = MockView()
        view.module_code = "test_mod"
        
        self.assertTrue(self.permission.has_permission(request, view))

    def test_module_code_mismatch(self):
        """Should deny if tenant has 'test_mod' but view requires 'other_mod'"""
        TenantModule.objects.create(
            company=self.company, 
            module=self.module, 
            is_active=True
        )
        
        request = self.factory.get('/')
        request.user = self.user
        request.company = self.company
        
        view = MockView()
        view.module_code = "other_mod" # Mismatch
        
        self.assertFalse(self.permission.has_permission(request, view))
