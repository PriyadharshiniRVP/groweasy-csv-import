const multer = require('multer');

// Files are handled in-memory only - nothing is ever written to disk, which
// keeps the service stateless (no cleanup jobs, safe for serverless hosts).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB is generous for a CSV
  fileFilter: (req, file, cb) => {
    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      return cb(new Error('Only .csv files are accepted'));
    }
    cb(null, true);
  },
});

module.exports = upload;
