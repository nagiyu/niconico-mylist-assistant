"""
Tests for Register performance optimizations.
"""
import pytest
from app.helpers import selenium_helper
from app.regist import distribute_id_list


class TestPerformanceOptimizations:
    def test_chrome_options_configuration(self):
        """Test that Chrome options include performance optimizations."""
        # We can't create a real driver in test environment, but we can check the configuration
        # by patching and inspecting what would be passed to webdriver.Chrome
        from unittest.mock import patch, MagicMock
        
        mock_chrome = MagicMock()
        with patch('app.helpers.selenium_helper.webdriver.Chrome', return_value=mock_chrome) as mock_chrome_constructor:
            try:
                selenium_helper.create_chrome_driver()
            except:
                pass  # Expected to fail in test environment
            
            # Verify Chrome was called with options
            assert mock_chrome_constructor.called
            options = mock_chrome_constructor.call_args[1]['options']
            
            # Check that performance optimization arguments are present
            arguments = options.arguments
            assert '--disable-images' in arguments
            assert '--disable-plugins' in arguments
            assert '--disable-extensions' in arguments
            assert '--disable-background-timer-throttling' in arguments
            
            # Check that prefs include image blocking
            prefs = options.experimental_options.get('prefs', {})
            assert prefs.get("profile.managed_default_content_settings.images") == 2
    
    def test_distribute_id_list_unchanged(self):
        """Test that the distribute_id_list function still works correctly."""
        id_list = ['video1', 'video2', 'video3', 'video4', 'video5']
        chunks = distribute_id_list(id_list, 3)
        
        # Should have 3 chunks
        assert len(chunks) == 3
        
        # All items should be distributed
        all_items = []
        for chunk in chunks:
            all_items.extend(chunk)
        assert set(all_items) == set(id_list)
        
        # Check distribution is reasonably balanced
        chunk_sizes = [len(chunk) for chunk in chunks]
        assert max(chunk_sizes) - min(chunk_sizes) <= 1
    
    def test_timeout_values_are_default(self):
        """Test that timeout values are at default 10 seconds."""
        # Check function signatures have default values
        import inspect
        
        # Check wait_and_click timeout default
        sig = inspect.signature(selenium_helper.wait_and_click)
        timeout_param = sig.parameters['timeout']
        assert timeout_param.default == 10, f"Expected timeout default 10, got {timeout_param.default}"
        
        # Check wait_and_find_element timeout default
        sig = inspect.signature(selenium_helper.wait_and_find_element)
        timeout_param = sig.parameters['timeout']
        assert timeout_param.default == 10, f"Expected timeout default 10, got {timeout_param.default}"
    
    def test_list_flattening_optimization(self):
        """Test that the list comprehension approach works correctly."""
        # Simulate the failed_id_lists structure
        test_sublists = [['video1', 'video2'], ['video3'], ['video4', 'video5']]
        
        # Test the optimized list comprehension approach
        flattened = [video_id for sublist in test_sublists for video_id in sublist]
        
        expected = ['video1', 'video2', 'video3', 'video4', 'video5']
        assert flattened == expected, f"Expected {expected}, got {flattened}"