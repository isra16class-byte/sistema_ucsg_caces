// ── Tipos ────────────────────────────────────────────────────────────────

export interface I2Materia {
  name: string;
  ef: number[];
}

export interface I3PuntoValidacion {
  nombre: string; // 'encabezado_institucional' | 'horas' | 'firma_docente' | 'firma_director' | 'reporte_mejora' | 'normativa'
  label: string;
  cumplido: boolean;
}

export interface I3Materia {
  name: string;
  // Puntos cumplidos por EF (índice 0=EF1 ... 3=EF4).
  // null = no se subió evidencia para ese EF ("Falta de evidencia").
  // 0..total = evidencia subida, con esa cantidad de puntos validados (de 3 para EF1-3, de 4 para EF4).
  efPuntos: [number | null, number | null, number | null, number | null];
  // Detalle opcional de cada punto (solo en algunas materias del mock; el resto usa solo efPuntos).
  efDetalle?: [I3PuntoValidacion[]?, I3PuntoValidacion[]?, I3PuntoValidacion[]?, I3PuntoValidacion[]?];
}

export interface PaoScore {
  pao: string;
  pct: number;
}

// ── I2: Seguimiento de Syllabus ─────────────────────────────────────────

export const EF_DEFS = [
  {
    id: "EF1",
    label: "Seguimiento contenidos",
    weight: 0.33,
    color: "#2563EB",
  },
  {
    id: "EF2",
    label: "Mejora micro currículo",
    weight: 0.27,
    color: "#16A34A",
  },
  {
    id: "EF3",
    label: "Proceso difundido",
    weight: 0.2,
    color: "#0891B2",
  },
  {
    id: "EF4",
    label: "Difusión syllabus EVA",
    weight: 0.13,
    color: "#CA8A04",
  },
  {
    id: "EF5",
    label: "Normativa institucional",
    weight: 0.07,
    color: "#7C3AED",
  },
];

export const ASIGNATURAS_BY_PAO: Record<string, I2Materia[]> = {
  "PAO 1": [
    {
      name: "Comunicación efectiva y trabajo en equipo",
      ef: [0.85, 0.9, 0.8, 0.75, 1],
    },
    {
      name: "Cultura tecnológica y digital",
      ef: [0.78, 0.82, 0.88, 0.65, 0.95],
    },
    {
      name: "Humanismo y Persona",
      ef: [0.9, 1, 0.75, 0.8, 1],
    },
    {
      name: "Fundamentos de Programación y Algoritmos",
      ef: [0.8, 1, 0.9, 0.6, 1],
    },
    {
      name:
        "Desarrollo de Interfaces de Usuario y Experiencia de Usuario (UI/UX)",
      ef: [0.75, 0.85, 0.88, 0.7, 0.95],
    },
    {
      name:
        "Bases para el desarrollo de Aplicaciones Móviles para Android",
      ef: [0.82, 0.78, 0.92, 0.55, 0.88],
    },
    {
      name: "Bases para el desarrollo de Aplicaciones Móviles para iOS",
      ef: [0.88, 0.95, 0.7, 0.85, 1],
    },
    {
      name: "Bases para el desarrollo Cross-Platform",
      ef: [0.72, 0.88, 0.85, 0.6, 0.9],
    },
  ],

  "PAO 2": [
    {
      name: "Seguridad y Optimización en Aplicaciones Móviles",
      ef: [0.9, 0.78, 0.92, 0.55, 0.88],
    },
    {
      name: "Introducción a Lenguajes de Programación",
      ef: [0.85, 1, 0.75, 0.8, 1],
    },
    {
      name:
        "Implementación de Estructuras de Datos y Algoritmos Avanzados",
      ef: [0.7, 0.8, 0.85, 0.5, 0.9],
    },
    {
      name: "Fundamentos de Bases de Datos",
      ef: [0.75, 0.85, 0.88, 0.7, 0.95],
    },
    {
      name: "Práctica Laboral",
      ef: [0.6, 0.7, 0.8, 0.45, 0.85],
    },
    {
      name: "Humanismo y Sociedad",
      ef: [0.88, 0.92, 0.78, 0.82, 1],
    },
    {
      name: "Emprendimiento e Innovación",
      ef: [0.65, 0.75, 0.7, 0.55, 0.8],
    },
    {
      name: "Servicio Comunitario",
      ef: [0.55, 0.65, 0.6, 0.5, 0.75],
    },
  ],

  "PAO 3": [
    {
      name: "Pensamiento Crítico y Lógico",
      ef: [0, 0, 0, 0, 0],
    },
    {
      name: "Aplicación de Conceptos de Ingeniería de Software",
      ef: [0, 0, 0, 0, 0],
    },
    {
      name: "Metodologías de Desarrollo Web",
      ef: [0, 0, 0, 0, 0],
    },
    {
      name: "Principios de Redes y Comunicaciones",
      ef: [0, 0, 0, 0, 0],
    },
    {
      name:
        "Principios de los Sistemas Operativos e Implementación de Software Empresarial",
      ef: [0, 0, 0, 0, 0],
    },
    {
      name: "Pruebas de Software y Aseguramiento de la Calidad",
      ef: [0, 0, 0, 0, 0],
    },
    {
      name: "Integración Curricular en Programación Aplicada",
      ef: [0, 0, 0, 0, 0],
    },
    {
      name: "Investigación Aplicada y Titulación",
      ef: [0, 0, 0, 0, 0],
    },
  ],
};

// ── I3: Tutorías Académicas ──────────────────────────────────────────────

export const I3_EF_DEFS = [
  {
    id: "EF1",
    label: "Evidencia de tutorías",
    weight: 0.4,
  },
  {
    id: "EF2",
    label: "Mejora académica",
    weight: 0.3,
  },
  {
    id: "EF3",
    label: "Seguimiento/cumplimiento",
    weight: 0.2,
  },
  {
    id: "EF4",
    label: "Normativa institucional",
    weight: 0.1,
  },
];

export const I3_MATERIAS_BY_PAO: Record<string, I3Materia[]> = {
  "PAO 1": [
    {
      name: "Comunicación efectiva y trabajo en equipo",
      efPuntos: [3, 3, 3, 4],
      efDetalle: [
        [
          { nombre: "encabezado_institucional", label: "Encabezado institucional", cumplido: true },
          { nombre: "horas", label: "Horas planificadas", cumplido: true },
          { nombre: "firma_docente", label: "Firma de docente", cumplido: true },
        ],
        [
          { nombre: "encabezado_institucional", label: "Encabezado institucional", cumplido: true },
          { nombre: "horas", label: "Horas cumplidas ≥ planificadas", cumplido: true },
          { nombre: "firma_docente", label: "Firma de docente", cumplido: true },
        ],
        [
          { nombre: "encabezado_institucional", label: "Encabezado institucional", cumplido: true },
          { nombre: "reporte_mejora", label: "Reporte de mejora académica", cumplido: true },
          { nombre: "firma_docente", label: "Firma de docente", cumplido: true },
        ],
        [
          { nombre: "encabezado_institucional", label: "Encabezado institucional", cumplido: true },
          { nombre: "normativa", label: "Normativa institucional vigente", cumplido: true },
          { nombre: "firma_docente", label: "Firma de docente", cumplido: true },
          { nombre: "firma_director", label: "Firma de director de carrera", cumplido: true },
        ],
      ],
    },
    {
      name: "Cultura tecnológica y digital",
      efPuntos: [3, 3, 2, 4], // EF3: sube evidencia pero solo cumple 2/3 puntos (66%)
      efDetalle: [
        undefined,
        undefined,
        [
          { nombre: "encabezado_institucional", label: "Encabezado institucional", cumplido: true },
          { nombre: "reporte_mejora", label: "Reporte de mejora académica", cumplido: true },
          { nombre: "firma_docente", label: "Firma de docente", cumplido: false },
        ],
        undefined,
      ],
    },
    {
      name: "Humanismo y Persona",
      efPuntos: [3, null, 3, 4],
    },
    {
      name: "Fundamentos de Programación y Algoritmos",
      efPuntos: [3, 3, 3, 4],
    },
    {
      name:
        "Desarrollo de Interfaces de Usuario y Experiencia de Usuario (UI/UX)",
      efPuntos: [null, 3, 3, 4],
    },
    {
      name:
        "Bases para el desarrollo de Aplicaciones Móviles para Android",
      efPuntos: [3, 3, 3, 3], // EF4: sube evidencia pero solo cumple 3/4 puntos (75%)
    },
    {
      name: "Bases para el desarrollo de Aplicaciones Móviles para iOS",
      efPuntos: [3, 3, 3, 4],
    },
    {
      name: "Bases para el desarrollo Cross-Platform",
      efPuntos: [3, null, 3, 4],
    },
  ],

  "PAO 2": [
    {
      name: "Seguridad y Optimización en Aplicaciones Móviles",
      efPuntos: [3, null, 3, 4],
    },
    {
      name: "Introducción a Lenguajes de Programación",
      efPuntos: [null, 3, 3, 4],
    },
    {
      name:
        "Implementación de Estructuras de Datos y Algoritmos Avanzados",
      efPuntos: [3, 3, 1, null], // EF3: sube evidencia pero solo cumple 1/3 puntos (33%)
    },
    {
      name: "Fundamentos de Bases de Datos",
      efPuntos: [3, 3, 3, 2], // EF4: sube evidencia pero solo cumple 2/4 puntos (50%)
    },
    {
      name: "Práctica Laboral",
      efPuntos: [null, null, 3, 4],
    },
    {
      name: "Humanismo y Sociedad",
      efPuntos: [3, 3, 3, 4],
    },
    {
      name: "Emprendimiento e Innovación",
      efPuntos: [3, null, null, 4],
    },
    {
      name: "Servicio Comunitario",
      efPuntos: [null, null, null, null],
    },
  ],

  "PAO 3": [
    {
      name: "Pensamiento Crítico y Lógico",
      efPuntos: [null, null, null, null],
    },
    {
      name: "Aplicación de Conceptos de Ingeniería de Software",
      efPuntos: [null, null, null, null],
    },
    {
      name: "Metodologías de Desarrollo Web",
      efPuntos: [null, null, null, null],
    },
    {
      name: "Principios de Redes y Comunicaciones",
      efPuntos: [null, null, null, null],
    },
    {
      name:
        "Principios de los Sistemas Operativos e Implementación de Software Empresarial",
      efPuntos: [null, null, null, null],
    },
    {
      name: "Pruebas de Software y Aseguramiento de la Calidad",
      efPuntos: [null, null, null, null],
    },
    {
      name: "Integración Curricular en Programación Aplicada",
      efPuntos: [null, null, null, null],
    },
    {
      name: "Investigación Aplicada y Titulación",
      efPuntos: [null, null, null, null],
    },
  ],
};

// Base de puntos por EF: EF1/EF2/EF3 = 3 puntos, EF4 = 4 puntos.
const I3_TOTAL_PUNTOS_POR_EF: [number, number, number, number] = [3, 3, 3, 4];

// Tabla de % oficial confirmada con el usuario, según puntos cumplidos / base del EF.
// 0 puntos cumplidos siempre es 0%, sin importar la base.
export function i3PorcentajePorPuntos(cumplidos: number, totalPuntos: number): number {
  if (cumplidos <= 0) return 0;
  if (totalPuntos === 3) {
    if (cumplidos >= 3) return 100;
    if (cumplidos === 2) return 66;
    if (cumplidos === 1) return 33;
    return 0;
  }
  if (totalPuntos === 4) {
    if (cumplidos >= 4) return 100;
    if (cumplidos === 3) return 75;
    if (cumplidos === 2) return 50;
    if (cumplidos === 1) return 25;
    return 0;
  }
  return Math.round((cumplidos / totalPuntos) * 100);
}

// % del EF (0-100) o null si no se subió evidencia para ese EF.
export function i3PctPorEf(materia: I3Materia, efIndex: number): number | null {
  const puntos = materia.efPuntos[efIndex];
  if (puntos === null) return null;
  return i3PorcentajePorPuntos(puntos, I3_TOTAL_PUNTOS_POR_EF[efIndex]);
}

// Devuelve null cuando falta al menos una evidencia (igual criterio que antes:
// la materia solo tiene score consolidado si subió los 4 EFs).
export function i3MateriaScore(materia: I3Materia): number | null {
  if (materia.efPuntos.some((puntos) => puntos === null)) {
    return null;
  }

  return I3_EF_DEFS.reduce((total, ef, index) => {
    const pct = i3PctPorEf(materia, index) ?? 0;
    return total + ef.weight * (pct / 100);
  }, 0) * 100;
}

// Calcula el porcentaje general de cobertura del PAO (promedio ponderado del
// % de cada EF entre todas las materias; una materia sin evidencia aporta 0
// a ese EF, igual que antes).
export function i3PaoScore(materias: I3Materia[]): number {
  if (materias.length === 0) {
    return 0;
  }

  const promediosPorEf = I3_EF_DEFS.map((_, index) => {
    const suma = materias.reduce((acc, materia) => acc + (i3PctPorEf(materia, index) ?? 0), 0);
    return suma / materias.length; // 0-100
  });

  return promediosPorEf.reduce((total, promedioPct, index) => {
    return total + (promedioPct / 100) * I3_EF_DEFS[index].weight * 100;
  }, 0);
}

// ── Resultados generales por PAO ─────────────────────────────────────────

export const PAO_SCORES: Record<string, PaoScore[]> = {
  I1: [
    { pao: "PAO 1", pct: 92 },
    { pao: "PAO 2", pct: 78 },
    { pao: "PAO 3", pct: 0 },
  ],

  I2: [
    { pao: "PAO 1", pct: 85 },
    { pao: "PAO 2", pct: 72 },
    { pao: "PAO 3", pct: 0 },
  ],

  I3: [
    { pao: "PAO 1", pct: 90 },
    { pao: "PAO 2", pct: 65 },
    { pao: "PAO 3", pct: 0 },
  ],
};