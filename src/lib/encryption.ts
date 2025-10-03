import CryptoJS from 'crypto-js';

export const encrypt = (text: string, passphrase?: string): string => {
  if (!passphrase) return text;
  return CryptoJS.AES.encrypt(text, passphrase).toString();
};

export const decrypt = (cipherText: string, passphrase?: string): string => {
  if (!passphrase) return cipherText;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, passphrase);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    // Si la desencriptación falla por una contraseña incorrecta, el resultado suele ser una cadena vacía.
    if (!decryptedText) {
      return "[Decryption Failed - Invalid Passphrase]";
    }
    return decryptedText;
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[Decryption Failed - Corrupted Data]";
  }
};