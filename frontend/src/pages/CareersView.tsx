import { useRef, useState } from "react";
import type { FormEvent } from "react";
import UsersManagementModal from "./UsersManagementModal";
import CohortsManagementModal from "./CohortsManagementModal";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Users,
  LogOut,
  Plus,
  ShieldCheck,
  TableProperties,
  Upload,
  User,
  X,
} from "lucide-react";

import { toast } from "sonner";

import CompassIcon from "../app/components/CompassIcon";
import { AREAS } from "../data/careers";

import type {
  Career,
  CareerArea,
} from "../types";
import type { UsuarioSesion } from "../services/auth";

interface CareersViewProps {
  onSelect: (career: Career) => void;
  onLogout: () => void;
  usuario: UsuarioSesion;
}

export default function CareersView({
  onSelect,
  onLogout,
  usuario,
}: CareersViewProps) {
  const [areas, setAreas] = useState<CareerArea[]>(AREAS);

  const [showNewCareer, setShowNewCareer] = useState(false);
  const [showDeleteCareer, setShowDeleteCareer] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [showUsersManagement, setShowUsersManagement] =
    useState(false);
  const [showCohortsManagement, setShowCohortsManagement] =
    useState(false);
  const [newCareerName, setNewCareerName] = useState("");
  const [newCareerArea, setNewCareerArea] = useState("");
  const [newCareerFile, setNewCareerFile] =
    useState<File | null>(null);

  const [deleteArea, setDeleteArea] = useState("");
  const [deleteCareer, setDeleteCareer] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  /*
   * Identificadores reales de la tabla carreras.
   * Actualmente Desarrollo de Software corresponde a id_carrera = 1.
   * Cuando agregues más carreras en MySQL, añade aquí sus IDs reales.
   */
  const carrerasAdministrables = [
    {
      id: 1,
      nombre: "Desarrollo de Software",
    },
  ];

  const deletableCareers = deleteArea
    ? areas.find((area) => area.name === deleteArea)?.careers ?? []
    : [];

  function closeNewCareerModal() {
    setShowNewCareer(false);
    setNewCareerName("");
    setNewCareerArea("");
    setNewCareerFile(null);
  }

  function closeDeleteCareerModal() {
    setShowDeleteCareer(false);
    setDeleteArea("");
    setDeleteCareer("");
  }

  function handleSaveCareer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = newCareerName
      .toUpperCase()
      .replace(/\s+/g, "")
      .slice(0, 8);

    const newCareer: Career = {
      name: newCareerName,
      code,
      cohortCode: "B2025",
      criterionNum: 4,
      clickable: false,
    };

    setAreas((previousAreas) =>
      previousAreas.map((area) =>
        area.name === newCareerArea
          ? {
              ...area,
              careers: [...area.careers, newCareer],
            }
          : area,
      ),
    );

    toast.success("Carrera agregada correctamente", {
      description: newCareerName,
    });

    closeNewCareerModal();
  }

  function handleDeleteCareer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const careerName =
      deletableCareers.find(
        (career) => career.code === deleteCareer,
      )?.name ?? deleteCareer;

    setAreas((previousAreas) =>
      previousAreas.map((area) =>
        area.name === deleteArea
          ? {
              ...area,
              careers: area.careers.filter(
                (career) => career.code !== deleteCareer,
              ),
            }
          : area,
      ),
    );

    toast.success("Carrera eliminada", {
      description: careerName,
    });

    closeDeleteCareerModal();
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: "#F1F5F9",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      <UsersManagementModal
        open={showUsersManagement}
        onClose={() =>
          setShowUsersManagement(false)
        }
      />

      <CohortsManagementModal
        open={showCohortsManagement}
        onClose={() =>
          setShowCohortsManagement(false)
        }
        carreras={carrerasAdministrables}
      />
      {/* Modal: eliminar carrera */}
      {showDeleteCareer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
            style={{
              border: "1px solid rgba(27,58,107,0.12)",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{
                borderColor: "rgba(27,58,107,0.1)",
              }}
            >
              <h2
                className="text-base font-bold"
                style={{
                  fontFamily: "'Libre Baskerville',serif",
                  color: "#0F1E3C",
                }}
              >
                Eliminar Carrera
              </h2>

              <button
                type="button"
                onClick={closeDeleteCareerModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X
                  size={15}
                  style={{
                    color: "#5A7295",
                  }}
                />
              </button>
            </div>

            <form
              onSubmit={handleDeleteCareer}
              className="px-6 py-5 space-y-4"
            >
              <p
                className="text-sm"
                style={{
                  color: "#5A7295",
                }}
              >
                Seleccione el área y la carrera que desea eliminar
                del sistema.
              </p>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{
                    color: "#5A7295",
                  }}
                >
                  Área de conocimiento
                </label>

                <div className="relative">
                  <select
                    value={deleteArea}
                    onChange={(event) => {
                      setDeleteArea(event.target.value);
                      setDeleteCareer("");
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer"
                    style={{
                      background: "#F4F7FB",
                      borderColor: "rgba(27,58,107,0.2)",
                      color: "#0F1E3C",
                    }}
                  >
                    <option value="">
                      — Seleccionar área —
                    </option>

                    {areas.map((area) => (
                      <option
                        key={area.name}
                        value={area.name}
                      >
                        {area.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      color: "#5A7295",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  opacity: deleteArea ? 1 : 0.45,
                  pointerEvents: deleteArea ? "auto" : "none",
                }}
              >
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{
                    color: "#5A7295",
                  }}
                >
                  Carrera
                </label>

                <div className="relative">
                  <select
                    value={deleteCareer}
                    onChange={(event) =>
                      setDeleteCareer(event.target.value)
                    }
                    required={Boolean(deleteArea)}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer"
                    style={{
                      background: "#F4F7FB",
                      borderColor: "rgba(27,58,107,0.2)",
                      color: "#0F1E3C",
                    }}
                  >
                    <option value="">
                      — Seleccionar carrera —
                    </option>

                    {deletableCareers.map((career) => (
                      <option
                        key={career.code}
                        value={career.code}
                      >
                        {career.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      color: "#5A7295",
                    }}
                  />
                </div>
              </div>

              {deleteCareer && (
                <div
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{
                    background: "#FEE2E2",
                    border: "1px solid #DC262630",
                  }}
                >
                  <AlertCircle
                    size={13}
                    style={{
                      color: "#DC2626",
                      flexShrink: 0,
                    }}
                  />

                  <p
                    className="text-xs"
                    style={{
                      color: "#991B1B",
                    }}
                  >
                    Esta acción no se puede deshacer. La carrera y
                    sus datos serán eliminados permanentemente.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!deleteCareer}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{
                    background: deleteCareer
                      ? "#DC2626"
                      : "#E5E7EB",
                    color: deleteCareer ? "#fff" : "#9CA3AF",
                    cursor: deleteCareer
                      ? "pointer"
                      : "not-allowed",
                  }}
                >
                  Eliminar
                </button>

                <button
                  type="button"
                  onClick={closeDeleteCareerModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all hover:bg-gray-50"
                  style={{
                    borderColor: "rgba(27,58,107,0.2)",
                    color: "#5A7295",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: nueva carrera */}
      {showNewCareer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
            style={{
              border: "1px solid rgba(27,58,107,0.12)",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{
                borderColor: "rgba(27,58,107,0.1)",
              }}
            >
              <h2
                className="text-base font-bold"
                style={{
                  fontFamily: "'Libre Baskerville',serif",
                  color: "#0F1E3C",
                }}
              >
                Nueva Carrera
              </h2>

              <button
                type="button"
                onClick={closeNewCareerModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X
                  size={15}
                  style={{
                    color: "#5A7295",
                  }}
                />
              </button>
            </div>

            <form
              onSubmit={handleSaveCareer}
              className="px-6 py-5 space-y-4"
            >
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{
                    color: "#5A7295",
                  }}
                >
                  Nombre de la carrera
                </label>

                <input
                  type="text"
                  value={newCareerName}
                  onChange={(event) =>
                    setNewCareerName(event.target.value)
                  }
                  placeholder="Ej: Administración de Empresas"
                  required
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{
                    background: "#F4F7FB",
                    borderColor: "rgba(27,58,107,0.2)",
                    color: "#0F1E3C",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{
                    color: "#5A7295",
                  }}
                >
                  Área de conocimiento
                </label>

                <div className="relative">
                  <select
                    value={newCareerArea}
                    onChange={(event) =>
                      setNewCareerArea(event.target.value)
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none appearance-none cursor-pointer"
                    style={{
                      background: "#F4F7FB",
                      borderColor: "rgba(27,58,107,0.2)",
                      color: "#0F1E3C",
                    }}
                  >
                    <option value="">
                      — Seleccionar área —
                    </option>

                    {areas.map((area) => (
                      <option
                        key={area.name}
                        value={area.name}
                      >
                        {area.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      color: "#5A7295",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{
                    color: "#5A7295",
                  }}
                >
                  Malla Curricular (PDF)
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:bg-blue-50"
                    style={{
                      borderColor: "rgba(27,58,107,0.2)",
                      color: "#1B3A6B",
                    }}
                  >
                    <Upload size={12} />

                    {newCareerFile
                      ? "Cambiar archivo"
                      : "Subir PDF"}
                  </button>

                  {newCareerFile && (
                    <span
                      className="text-xs truncate max-w-40"
                      style={{
                        color: "#16A34A",
                      }}
                    >
                      {newCareerFile.name}
                    </span>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(event) =>
                    setNewCareerFile(
                      event.target.files?.[0] ?? null,
                    )
                  }
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{
                    background: "#1B3A6B",
                    color: "#fff",
                  }}
                >
                  Guardar
                </button>

                <button
                  type="button"
                  onClick={closeNewCareerModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all hover:bg-gray-50"
                  style={{
                    borderColor: "rgba(27,58,107,0.2)",
                    color: "#5A7295",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barra superior */}
      <div
        className="flex-shrink-0 border-b flex items-center justify-between px-6"
        style={{
          height: 52,
          background: "#fff",
          borderColor: "rgba(27,58,107,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "#1B3A6B",
            }}
          >
            <ShieldCheck
              size={13}
              className="text-white"
            />
          </div>

          <span
            className="font-bold text-sm"
            style={{
              color: "#0F1E3C",
            }}
          >
            CACES · UAFTT
          </span>

          <span
            className="hidden sm:inline text-xs"
            style={{
              color: "#9CA3AF",
            }}
          >
            — Sistema de Evaluación Institucional
          </span>
        </div>

        <div className="flex items-center gap-3">
          {usuario.rol === "administrador" && (
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setShowManageMenu(!showManageMenu)
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{
                background: "#1B3A6B",
                color: "#fff",
              }}
            >
              <TableProperties size={12} />

              Gestionar

              <ChevronDown
                size={11}
                className={`transition-transform ${
                  showManageMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showManageMenu && (
              <div
                className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg overflow-hidden z-50"
                style={{
                  border: "1px solid rgba(27,58,107,0.12)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowManageMenu(false);
                    setShowNewCareer(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                  style={{
                    color: "#1B3A6B",
                  }}
                >
                  <Plus size={13} />
                  Nueva carrera
                </button>

                <div
                  style={{
                    height: 1,
                    background: "rgba(27,58,107,0.07)",
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowManageMenu(false);
                    setShowCohortsManagement(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                  style={{
                    color: "#1B3A6B",
                  }}
                >
                  <CalendarDays size={13} />
                  Gestionar cohortes
                </button>

                <div
                  style={{
                    height: 1,
                    background: "rgba(27,58,107,0.07)",
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowManageMenu(false);
                    setShowUsersManagement(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                  style={{
                    color: "#1B3A6B",
                  }}
                >
                  <Users size={13} />
                  Gestionar usuarios
                </button>

                <div
                  style={{
                    height: 1,
                    background: "rgba(27,58,107,0.07)",
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowManageMenu(false);
                    setShowDeleteCareer(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
                  style={{
                    color: "#DC2626",
                  }}
                >
                  <X size={13} />
                  Eliminar carrera
                </button>
              </div>
            )}
          </div>
          )}

          <div
            className="hidden sm:flex items-center gap-2 text-xs"
            style={{
              color: "#5A7295",
            }}
          >
            <User size={13} />
            <div className="leading-tight text-right">
              <p
                className="font-semibold"
                style={{ color: "#0F1E3C" }}
              >
                {usuario.nombres} {usuario.apellidos}
              </p>
              <p
                className="capitalize"
                style={{ color: "#5A7295", fontSize: 10 }}
              >
                {usuario.rol}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            style={{
              color: "#5A7295",
            }}
          >
            <LogOut size={12} />
            Salir
          </button>
        </div>
      </div>

      <div
        className="flex-shrink-0"
        style={{
          height: 12,
        }}
      />

      {/* Áreas y carreras */}
      <div className="flex-1 min-h-0 px-6 pb-5 grid grid-cols-3 gap-4 overflow-hidden">
        {areas.map((area) => (
          <div
            key={area.name}
            className="bg-white rounded-xl overflow-hidden flex flex-col border"
            style={{
              borderColor: "rgba(27,58,107,0.1)",
              boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="relative flex-shrink-0"
              style={{
                height: 110,
              }}
            >
              <img
                src={area.image}
                alt={area.name}
                className="w-full h-full object-cover"
              />

              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom,rgba(15,30,60,0.1),rgba(15,30,60,0.7))",
                }}
              />

              <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex items-center gap-2">
                <CompassIcon size={28} />

                <h2
                  className="text-xs font-bold text-white leading-tight"
                  style={{
                    fontFamily: "'Libre Baskerville',serif",
                  }}
                >
                  {area.name}
                </h2>
              </div>
            </div>

            <div
              style={{
                height: 1,
                background: "rgba(27,58,107,0.08)",
              }}
            />

            <div className="flex-1 flex flex-col justify-start overflow-hidden">
              {area.careers.map((career, index) => (
                <div
                  key={career.name}
                  onClick={() => {
                    if (career.clickable) {
                      onSelect(career);
                    }
                  }}
                  className={`flex items-center justify-between px-3 transition-colors ${
                    career.clickable
                      ? "cursor-pointer hover:bg-blue-50 group"
                      : "cursor-default"
                  }`}
                  style={{
                    borderBottom:
                      index < area.careers.length - 1
                        ? "1px solid rgba(27,58,107,0.06)"
                        : "none",
                    minHeight: 34,
                    paddingTop: 5,
                    paddingBottom: 5,
                  }}
                >
                  <span
                    className={`text-xs leading-tight ${
                      career.clickable
                        ? "font-semibold group-hover:text-blue-700"
                        : ""
                    }`}
                    style={{
                      color: career.clickable
                        ? "#1B3A6B"
                        : "#374151",
                    }}
                  >
                    {career.name}
                  </span>

                  {career.clickable && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ml-2"
                      style={{
                        background: "#DBEAFE",
                        color: "#1D4ED8",
                      }}
                    >
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showManageMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowManageMenu(false)}
        />
      )}
    </div>
  );
}