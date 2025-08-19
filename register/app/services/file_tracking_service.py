import os


class FileTrackingService:
    """Service for managing temporary file tracking for chunked processing"""
    
    @staticmethod
    def create_tracking_file(uuid: str, chunk_index: str) -> str:
        """
        Create a tracking file to indicate processing is in progress.
        
        Args:
            uuid: Unique identifier for the batch
            chunk_index: Index of the current chunk
            
        Returns:
            Path to the created tracking file
        """
        tmp_file_path = f"/tmp/register-{uuid}-{chunk_index}"
        with open(tmp_file_path, "w") as f:
            f.write("processing")
        return tmp_file_path
    
    @staticmethod
    def remove_tracking_file(file_path: str) -> None:
        """
        Remove a tracking file when processing is complete.
        
        Args:
            file_path: Path to the tracking file to remove
        """
        if os.path.exists(file_path):
            os.remove(file_path)
    
    @staticmethod
    def is_all_chunks_complete(uuid: str) -> bool:
        """
        Check if all chunks for a given UUID are complete.
        
        Args:
            uuid: Unique identifier for the batch
            
        Returns:
            True if all chunks are complete (no tracking files remain)
        """
        tmp_dir = "/tmp"
        files = [f for f in os.listdir(tmp_dir) if f.startswith(f"register-{uuid}-")]
        return len(files) == 0