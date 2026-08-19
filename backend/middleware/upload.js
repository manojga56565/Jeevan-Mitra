const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeStorage(subfolder) {
  const dest = path.join(__dirname, '..', 'uploads', subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    }
  });
}

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const docFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG, or PDF files are allowed'), false);
};

const uploadHospitalDoc = multer({
  storage: makeStorage('documents'),
  fileFilter: docFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadHospitalImage = multer({
  storage: makeStorage('hospitals'),
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 }
});

module.exports = { uploadHospitalDoc, uploadHospitalImage };
