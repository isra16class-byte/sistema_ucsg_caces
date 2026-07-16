export function validatePDF(file: File): string | null {
  const isPDF =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPDF) {
    return "Solo se aceptan archivos en formato PDF (.pdf)";
  }

  if (file.size > 25 * 1024 * 1024) {
    return "El archivo no debe superar 25 MB";
  }

  return null;
}