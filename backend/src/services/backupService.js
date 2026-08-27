const fs = require('fs');
const path = require('path');
const db = require('../config/database');

class BackupService {
  static getDbPath() {
    return db.getDbPath ? db.getDbPath() : path.join(__dirname, '../../data/deaturnos.db');
  }

  static createBackup() {
    try {
      if (db.persistToDisk) db.persistToDisk();
      const currentPath = this.getDbPath();
      if (!fs.existsSync(currentPath)) return null;

      const backupDir = path.join(path.dirname(currentPath), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const now = new Date();
      const timestamp = now.isoString ? now.toISOString().replace(/[:.]/g, '-') : Date.now();
      const backupPath = path.join(backupDir, `deaturnos_backup_${timestamp}.db`);

      fs.copyFileSync(�\��[�]�X��\]
N��ۜ��[\�H�˜�XY\��[���X��\\�B���[\��O����\���]
	�X]\����ؘX��\��H	����[���]
	˙��JB��X\
�O�
��[YN��[YN��˜�]�[��]���[��X��\\��JK�][YK��][YJ
HJJB���ܝ

K�HO���[YHHK�[YJN�Y�
�[\˛[���MJH�܈
]HHMN�H�[\˛[���J��H�H�˝[�[���[��]���[��X��\\��[\��WK��[YJJNH�]��B�B�B���]\���X��\]H�]�
JH�ۜ��K�\��܊	�\��܈ܙX[����XHH�\�[Ή�JN�]\���[B�B���]X��]�X��\�Y��\�
HY�
��\��\��\��H��\��\��\��
N�ۜ��\��[�]H\˙�]�]

NY�
�˙^\���[���\��[�]
JH�]\���˜�XY�[T�[���\��[�]
NB��]\���[B�B��[�[K�^ܝ�H�X��\�\��X�N�