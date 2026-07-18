import { useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
} from "lucide-react";

import type { EvidenceSlot } from "../../types";
import { validatePDF, validateCSV } from "../../utils/pdf";

interface PdfZoneProps {
  slot: EvidenceSlot;
  fileName: string;
  onChange: (slot: EvidenceSlot) => void;
  onFileSelected?: (
    slot: EvidenceSlot,
    file: File,
  ) => void;
  disabled?: boolean;
}

export default function PdfZone({
  slot,
  fileName,
  onChange,
  onFileSelected,
  disabled = false,
}: PdfZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const esCsv = slot.acceptedType === "csv";

  function pick(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const error = esCsv ? validateCSV(file) : validatePDF(file);

    if (error) {
      onChange({
        ...slot,
        error,
        file: undefined,
      });

      event.target.value = "";
      return;
    }

    /*
      Si el componente padre proporciona onFileSelected,
      le entregamos el archivo para que sea validado por PHP
      y se genere el nombre oficial.
    */
    if (onFileSelected) {
      onFileSelected(slot, file);
      event.target.value = "";
      return;
    }

    /*
      Este bloque funciona como respaldo.
      Se usa únicamente si no se proporcionó onFileSelected.
    */
    onChange({
      ...slot,
      error: undefined,
      file: {
        fileName,
        originalName: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        rawFile: file,
      },
    });

    event.target.value = "";
  }

  const hasFile = Boolean(slot.file);
  const hasError = Boolean(slot.error);
  const isShared = disabled && hasFile;

  return (
    <div
      className="rounded-xl p-3 border transition-all"
      style={{
        borderColor: hasFile
          ? "#16A34A"
          : hasError
            ? "#DC2626"
            : "rgba(27,58,107,0.15)",
        background: hasFile
          ? "#F0FDF4"
          : hasError
            ? "#FEF2F2"
            : "#F8FAFD",
        opacity: disabled && !hasFile ? 0.55 : 1,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0">
          {hasFile ? (
            <CheckCircle2
              size={15}
              style={{ color: "#16A34A" }}
            />
          ) : hasError ? (
            <XCircle
              size={15}
              style={{ color: "#DC2626" }}
            />
          ) : (
            <FileText
              size={15}
              style={{ color: "#5A7295" }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold leading-snug"
            style={{ color: "#0F1E3C" }}
          >
            {slot.label}
          </p>

          {hasFile ? (
            <>
              <p
                className="text-xs font-bold mt-0.5 break-all"
                style={{
                  color: "#16A34A",
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {slot.file?.fileName}
              </p>

              {isShared && (
                <div className="mt-1">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#2563EB" }}
                  >
                    🔗 Evidencia compartida
                  </p>

                  <p
                    className="text-xs"
                    style={{ color: "#5A7295" }}
                  >
                    Origen: {slot.sharedFrom ?? "otro indicador"}
                  </p>
                </div>
              )}
            </>
          ) : hasError ? (
            <p
              className="text-xs mt-0.5"
              style={{ color: "#DC2626" }}
            >
              {slot.error}
            </p>
          ) : (
            <p
              className="text-xs mt-0.5 break-all"
              style={{
                color: "#9CA3AF",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {fileName}
            </p>
          )}
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{
              background: hasFile
                ? "#16A34A"
                : "#1B3A6B",
              color: "#fff",
            }}
          >
            <Upload size={10} />

            {hasFile ? "Cambiar" : "Subir"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={
          esCsv
            ? ".csv,text/csv"
            : ".pdf,application/pdf"
        }
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}