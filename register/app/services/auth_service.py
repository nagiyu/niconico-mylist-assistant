import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class AuthService:
    """Service for handling authentication and password decryption"""
    
    @staticmethod
    def decrypt_password(encrypted_password: str) -> str:
        """
        Decrypt the encrypted password using shared secret key.
        
        Args:
            encrypted_password: base64 encoded encrypted password
            
        Returns:
            Decrypted password string
            
        Raises:
            Exception: If decryption fails
        """
        try:
            # Get shared secret key from environment
            SHARED_SECRET = base64.b64decode(os.environ["SHARED_SECRET_KEY"])
            
            # Password is base64( nonce + ciphertext + tag )
            encrypted_bytes = base64.b64decode(encrypted_password)
            nonce = encrypted_bytes[:12]
            ct_and_tag = encrypted_bytes[12:]
            
            # Decrypt using AES-GCM
            aesgcm = AESGCM(SHARED_SECRET)
            password = aesgcm.decrypt(nonce, ct_and_tag, None).decode("utf-8")
            
            return password
        except Exception as e:
            raise Exception(f"Failed to decrypt password: {str(e)}")