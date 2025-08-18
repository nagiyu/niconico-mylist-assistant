import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class AuthService:
    """Service for handling authentication and password encryption/decryption"""
    
    @staticmethod
    def encrypt_password(password: str, base64_key: str) -> str:
        """
        Encrypt a password using shared secret key.
        
        Args:
            password: Plain text password to encrypt
            base64_key: Base64 encoded secret key
            
        Returns:
            Base64 encoded encrypted password
            
        Raises:
            Exception: If encryption fails
        """
        try:
            key = base64.b64decode(base64_key)
            aesgcm = AESGCM(key)
            
            # Generate 12-byte nonce
            nonce = os.urandom(12)
            
            # Encrypt the password
            ct_and_tag = aesgcm.encrypt(nonce, password.encode("utf-8"), None)
            
            # Return base64( nonce + ciphertext + tag )
            encrypted = base64.b64encode(nonce + ct_and_tag).decode("utf-8")
            
            return encrypted
        except Exception as e:
            raise Exception(f"Failed to encrypt password: {str(e)}")
    
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