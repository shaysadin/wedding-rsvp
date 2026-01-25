/**
 * Calculate seat positions around a table based on shape and arrangement
 */

export type SeatingArrangement = "even" | "bride-side" | "sides-only" | "custom";
export type TableShape = "square" | "circle" | "rectangle" | "oval";

/**
 * Get available seating arrangements for a specific table shape
 */
export function getAvailableArrangements(shape: TableShape): SeatingArrangement[] {
  if (shape === "circle" || shape === "oval") {
    return ["even"];
  } else if (shape === "rectangle") {
    // Rectangle has seats only on long sides
    return ["even", "bride-side", "sides-only"];
  } else if (shape === "square") {
    // Square has seats on all 4 sides
    return ["even"];
  }
  return ["even"];
}

export interface SeatPosition {
  seatNumber: number;
  relativeX: number; // -1 to 1 (relative to table center)
  relativeY: number; // -1 to 1 (relative to table center)
  angle: number; // Rotation angle in degrees
  side?: "bride" | "groom" | "head" | "foot"; // For bride-side arrangement
}

/**
 * Generate seat positions based on table configuration
 */
export function calculateSeatPositions(
  capacity: number,
  shape: TableShape,
  arrangement: SeatingArrangement = "even"
): SeatPosition[] {
  switch (arrangement) {
    case "even":
      return calculateEvenDistribution(capacity, shape);
    case "bride-side":
      return calculateBrideSideDistribution(capacity, shape);
    case "sides-only":
      return calculateSidesOnlyDistribution(capacity, shape);
    case "custom":
      // Return default even distribution - user will customize
      return calculateEvenDistribution(capacity, shape);
    default:
      return calculateEvenDistribution(capacity, shape);
  }
}

/**
 * Even distribution based on shape:
 * - Square: seats on top and bottom sides only
 * - Circle: seats around the circumference
 * - Rectangle: seats only on top and bottom (long sides)
 * - Oval: seats around the ellipse perimeter
 */
function calculateEvenDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  const seats: SeatPosition[] = [];

  if (shape === "circle") {
    // Distribute evenly around circle
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * 360;
      const radians = (angle - 90) * (Math.PI / 180); // Start at top

      seats.push({
        seatNumber: i + 1,
        relativeX: Math.cos(radians) * 0.5, // 0.5 = on the edge
        relativeY: Math.sin(radians) * 0.5,
        angle: angle,
      });
    }
  } else if (shape === "square") {
    // Seats only on 2 sides (top and bottom), same as rectangle
    const halfCapacity = Math.ceil(capacity / 2);
    const otherHalf = capacity - halfCapacity;
    let seatNum = 1;

    // Top side (chairs facing inward toward table)
    for (let i = 0; i < halfCapacity; i++) {
      const spacing = halfCapacity > 1 ? (i / (halfCapacity - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.4 + spacing * 0.8,
        relativeY: -0.5,
        angle: 0,
      });
    }

    // Bottom side (chairs facing inward toward table)
    for (let i = 0; i < otherHalf; i++) {
      const spacing = otherHalf > 1 ? (i / (otherHalf - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.4 - spacing * 0.8,
        relativeY: 0.5,
        angle: 180,
      });
    }
  } else if (shape === "rectangle") {
    // For rectangle: seats ONLY on the two long sides (top and bottom)
    const halfCapacity = Math.ceil(capacity / 2);
    const otherHalf = capacity - halfCapacity;
    let seatNum = 1;

    // Top side (chairs facing inward toward table)
    for (let i = 0; i < halfCapacity; i++) {
      const spacing = halfCapacity > 1 ? (i / (halfCapacity - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.4 + spacing * 0.8,
        relativeY: -0.5,
        angle: 0,
      });
    }

    // Bottom side (chairs facing inward toward table)
    for (let i = 0; i < otherHalf; i++) {
      const spacing = otherHalf > 1 ? (i / (otherHalf - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.4 - spacing * 0.8,
        relativeY: 0.5,
        angle: 180,
      });
    }
  } else if (shape === "oval") {
    // Distribute around ellipse perimeter
    // Using parametric equation: x = a*cos(θ), y = b*sin(θ)
    // For visual purposes, we use 0.5 as the base radius
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * 360;
      const radians = (angle - 90) * (Math.PI / 180); // Start at top

      // Oval shape with slight horizontal stretch (a = 0.5, b = 0.45)
      seats.push({
        seatNumber: i + 1,
        relativeX: Math.cos(radians) * 0.5,
        relativeY: Math.sin(radians) * 0.45,
        angle: angle,
      });
    }
  }

  return seats;
}

/**
 * Bride/Groom side distribution - one side for bride's guests, other for groom's
 * Only applicable for rectangle shape
 */
function calculateBrideSideDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const halfCapacity = Math.ceil(capacity / 2);

  if (shape === "rectangle") {
    let seatNum = 1;

    // Bride's side (top - chairs facing inward)
    for (let i = 0; i < halfCapacity; i++) {
      const spacing = halfCapacity > 1 ? (i / (halfCapacity - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.4 + spacing * 0.8,
        relativeY: -0.5,
        angle: 0,
        side: "bride",
      });
    }

    // Groom's side (bottom - chairs facing inward)
    for (let i = 0; i < capacity - halfCapacity; i++) {
      const spacing = (capacity - halfCapacity) > 1 ? (i / (capacity - halfCapacity - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.4 - spacing * 0.8,
        relativeY: 0.5,
        angle: 180,
        side: "groom",
      });
    }
  } else {
    // Fall back to even distribution for other shapes
    return calculateEvenDistribution(capacity, shape);
  }

  return seats;
}

/**
 * Sides only distribution - same as even for rectangle (seats on long sides only)
 */
function calculateSidesOnlyDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  // For rectangle, "sides only" is the same as "even" since we only use long sides
  return calculateEvenDistribution(capacity, shape);
}

/**
 * Convert relative position to absolute canvas position
 */
export function seatRelativeToAbsolute(
  relativeX: number,
  relativeY: number,
  tableX: number,
  tableY: number,
  tableWidth: number,
  tableHeight: number,
  tableRotation: number = 0
): { x: number; y: number } {
  // Apply table rotation
  const rotRad = (tableRotation * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  // Scale relative position to table dimensions
  const localX = relativeX * tableWidth;
  const localY = relativeY * tableHeight;

  // Rotate around table center
  const rotatedX = localX * cos - localY * sin;
  const rotatedY = localX * sin + localY * cos;

  // Translate to canvas coordinates
  return {
    x: tableX + tableWidth / 2 + rotatedX,
    y: tableY + tableHeight / 2 + rotatedY,
  };
}
