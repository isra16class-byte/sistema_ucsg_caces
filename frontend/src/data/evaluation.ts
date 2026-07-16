// ── Tipos ────────────────────────────────────────────────────────────────

export interface I2Materia {
  name: string;
  ef: number[];
}

export interface I3Materia {
  name: string;
  efDocs: [boolean, boolean, boolean, boolean];
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
      efDocs: [true, true, true, true],
    },
    {
      name: "Cultura tecnológica y digital",
      efDocs: [true, true, false, true],
    },
    {
      name: "Humanismo y Persona",
      efDocs: [true, false, true, true],
    },
    {
      name: "Fundamentos de Programación y Algoritmos",
      efDocs: [true, true, true, true],
    },
    {
      name:
        "Desarrollo de Interfaces de Usuario y Experiencia de Usuario (UI/UX)",
      efDocs: [false, true, true, true],
    },
    {
      name:
        "Bases para el desarrollo de Aplicaciones Móviles para Android",
      efDocs: [true, true, true, false],
    },
    {
      name: "Bases para el desarrollo de Aplicaciones Móviles para iOS",
      efDocs: [true, true, true, true],
    },
    {
      name: "Bases para el desarrollo Cross-Platform",
      efDocs: [true, false, true, true],
    },
  ],

  "PAO 2": [
    {
      name: "Seguridad y Optimización en Aplicaciones Móviles",
      efDocs: [true, false, true, true],
    },
    {
      name: "Introducción a Lenguajes de Programación",
      efDocs: [false, true, true, true],
    },
    {
      name:
        "Implementación de Estructuras de Datos y Algoritmos Avanzados",
      efDocs: [true, true, false, false],
    },
    {
      name: "Fundamentos de Bases de Datos",
      efDocs: [true, true, true, false],
    },
    {
      name: "Práctica Laboral",
      efDocs: [false, false, true, true],
    },
    {
      name: "Humanismo y Sociedad",
      efDocs: [true, true, true, true],
    },
    {
      name: "Emprendimiento e Innovación",
      efDocs: [true, false, false, true],
    },
    {
      name: "Servicio Comunitario",
      efDocs: [false, false, false, false],
    },
  ],

  "PAO 3": [
    {
      name: "Pensamiento Crítico y Lógico",
      efDocs: [false, false, false, false],
    },
    {
      name: "Aplicación de Conceptos de Ingeniería de Software",
      efDocs: [false, false, false, false],
    },
    {
      name: "Metodologías de Desarrollo Web",
      efDocs: [false, false, false, false],
    },
    {
      name: "Principios de Redes y Comunicaciones",
      efDocs: [false, false, false, false],
    },
    {
      name:
        "Principios de los Sistemas Operativos e Implementación de Software Empresarial",
      efDocs: [false, false, false, false],
    },
    {
      name: "Pruebas de Software y Aseguramiento de la Calidad",
      efDocs: [false, false, false, false],
    },
    {
      name: "Integración Curricular en Programación Aplicada",
      efDocs: [false, false, false, false],
    },
    {
      name: "Investigación Aplicada y Titulación",
      efDocs: [false, false, false, false],
    },
  ],
};

// Devuelve null cuando falta al menos una evidencia.
export function i3MateriaScore(materia: I3Materia): number | null {
  if (materia.efDocs.some((tieneDocumento) => !tieneDocumento)) {
    return null;
  }

  return (
    I3_EF_DEFS.reduce((total, ef, index) => {
      const valor = materia.efDocs[index] ? 1 : 0;
      return total + ef.weight * valor;
    }, 0) * 100
  );
}

// Calcula el porcentaje general de cobertura del PAO.
export function i3PaoScore(materias: I3Materia[]): number {
  if (materias.length === 0) {
    return 0;
  }

  const coberturas = I3_EF_DEFS.map((_, index) => {
    const materiasConEvidencia = materias.filter(
      (materia) => materia.efDocs[index],
    ).length;

    return materiasConEvidencia / materias.length;
  });

  return (
    coberturas.reduce((total, cobertura, index) => {
      return total + cobertura * I3_EF_DEFS[index].weight;
    }, 0) * 100
  );
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