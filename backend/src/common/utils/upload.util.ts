/**
 * Multer (busboy) decodes multipart filenames as latin1, which mangles UTF-8
 * names (e.g. Vietnamese "Đề cương" becomes "Ä‘á»' cÆ°Æ¡ng"). Re-decode the
 * raw bytes as UTF-8 so the original filename is preserved.
 */
export function fixUploadedFilename<T extends Express.Multer.File>(file: T): T {
  if (file?.originalname) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
  }
  return file;
}
