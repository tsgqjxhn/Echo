// ============================================================
// Save/Load system — encrypted JSON, anti-cheat, auto-backup
// ============================================================

class SaveSystem {
  constructor() {
    this.SAVE_KEY = 'cultivation_idle_save';
    this.BACKUP_KEY = 'cultivation_idle_backup';
    this.CIPHER_KEY = 'XiuXianDao_2024_Key!';
  }

  // Simple XOR-based encryption (lightweight for browser)
  encrypt(data) {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(data));
    const key = this.CIPHER_KEY;
    const encrypted = new Uint8Array(jsonBytes.length);
    for (let i = 0; i < jsonBytes.length; i++) {
      encrypted[i] = jsonBytes[i] ^ key.charCodeAt(i % key.length);
    }
    return `v2:${this._bytesToBase64(encrypted)}`;
  }

  decrypt(encoded) {
    try {
      if (encoded.startsWith('v2:')) {
        return this._decryptV2(encoded.slice(3));
      }
      return this._decryptLegacy(encoded);
    } catch (e) {
      console.error('Save decryption failed:', e);
      return null;
    }
  }

  save(player) {
    try {
      const data = player.serialize();
      // Add checksum
      data._checksum = this._generateChecksum(data);
      data._saveVersion = 2;

      const encrypted = this.encrypt(data);
      // Backup current save before overwriting
      const existing = localStorage.getItem(this.SAVE_KEY);
      if (existing) {
        localStorage.setItem(this.BACKUP_KEY, existing);
      }
      localStorage.setItem(this.SAVE_KEY, encrypted);
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  load() {
    try {
      const encrypted = localStorage.getItem(this.SAVE_KEY);
      if (!encrypted) return null;

      const data = this.decrypt(encrypted);
      if (!data) return null;

      // Verify checksum
      const checksum = data._checksum;
      delete data._checksum;
      delete data._saveVersion;

      if (checksum !== this._generateChecksum(data)) {
        console.warn('Save checksum mismatch — data may be corrupted');
        // Try backup
        return this.loadBackup();
      }

      // Anti-cheat: check timestamps make sense
      if (data.lastOnlineTime && data.lastOnlineTime > Date.now()) {
        console.warn('Timestamp in future detected');
        data.lastOnlineTime = Date.now();
      }

      return data;
    } catch (e) {
      console.error('Load failed:', e);
      return this.loadBackup();
    }
  }

  loadBackup() {
    try {
      const encrypted = localStorage.getItem(this.BACKUP_KEY);
      if (!encrypted) return null;
      const data = this.decrypt(encrypted);
      if (data) {
        delete data._checksum;
        delete data._saveVersion;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  hasSave() {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  }

  deleteSave() {
    localStorage.removeItem(this.SAVE_KEY);
    localStorage.removeItem(this.BACKUP_KEY);
  }

  // Simple checksum using data hash
  _generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Export save as downloadable file
  exportSave(player) {
    const data = player.serialize();
    data._checksum = this._generateChecksum(data);
    data._saveVersion = 2;
    const encrypted = this.encrypt(data);
    return encrypted;
  }

  // Import save from string
  importSave(encrypted) {
    const data = this.decrypt(encrypted);
    if (!data) return null;
    const checksum = data._checksum;
    delete data._checksum;
    delete data._saveVersion;
    if (checksum !== this._generateChecksum(data)) return null;
    return data;
  }

  _decryptV2(payload) {
    const key = this.CIPHER_KEY;
    const encrypted = this._base64ToBytes(payload);
    const jsonBytes = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      jsonBytes[i] = encrypted[i] ^ key.charCodeAt(i % key.length);
    }
    return JSON.parse(new TextDecoder().decode(jsonBytes));
  }

  _decryptLegacy(encoded) {
    const key = this.CIPHER_KEY;
    const decoded = atob(encoded);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return JSON.parse(result);
  }

  _bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  _base64ToBytes(encoded) {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
