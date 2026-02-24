import multer from "multer";

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5MB

const storage = multer.memoryStorage(); 
// memoryStorage = keep file in RAM as Buffer (easy for uploading to Supabase Storage)

function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, or WEBP allowed."));
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});