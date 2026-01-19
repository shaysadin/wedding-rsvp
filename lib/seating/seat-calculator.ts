/**
 * Calculate seat positions around a table based on shape and arrangement
 */

export type SeatingArrangement = "even" | "bride-side" | "sides-only" | "custom";
export type TableShape = "circle" | "rectangle" | "rectangleRounded" | "concave" | "concaveRounded";

/**
 * Get available seating arrangements for a specific table shape
 */
export function getAvailableArrangements(shape: TableShape): SeatingArrangement[] {
  if (shape === "circle") {
    return ["even"];
  } else if (shape.includes("concave")) {
    return ["even"];
  } else if (shape.includes("rectangle")) {
    return ["even", "bride-side", "sides-only"];
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
 * Even distribution around perimeter
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
  } else if (shape.includes("rectangle")) {
    // Distribute around rectangle perimeter
    const longSide = Math.ceil(capacity / 2);
    const shortSide = Math.floor(capacity / 2);

    let seatNum = 1;

    // Top side
    for (let i = 0; i < longSide; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.4 + (i / (longSide - 1 || 1)) * 0.8,
        relativeY: -0.5,
        angle: 180,
      });
    }

    // Bottom side
    for (let i = 0; i < shortSide; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.4 - (i / (shortSide - 1 || 1)) * 0.8,
        relativeY: 0.5,
        angle: 0,
      });
    }
  } else if (shape.includes("concave")) {
    // Distribute along the concave arc (half-circle)
    for (let i = 0; i < capacity; i++) {
      const angle = 180 + (i / (capacity - 1 || 1)) * 180; // 180 to 360 degrees
      const radians = (angle - 90) * (Math.PI / 180);

      seats.push({
        seatNumber: i + 1,
        relativeX: Math.cos(radians) * 0.45,
        relativeY: Math.sin(radians) * 0.45,
        angle: angle,
      });
    }
  }

  return seats;
}

/**
 * Bride/Groom side distribution
 */
function calculateBrideSideDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const halfCapacity = Math.ceil(capacity / 2);

  if (shape.includes("rectangle")) {
    let seatNum = 1;

    // Bride's side (left)
    for (let i = 0; i < halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.5,
        relativeY: -0.4 + (i / (halfCapacity - 1 || 1)) * 0.8,
        angle: 90,
        side: "bride",
      });
    }

    // Groom's side (right)
    for (let i = 0; i < capacity - halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.5,
        relativeY: -0.4 + (i / (capacity - halfCapacity - 1 || 1)) * 0.8,
        angle: 270,
        side: "groom",
      });
    }
  } else {
    // Fall back to even distribution for non-rectangular shapes
    return calculateEvenDistribution(capacity, shape);
  }

  return seats;
}

/**
 * Sides only distribution (no head/foot seats)
 */
function calculateSidesOnlyDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const halfCapacity = Math.ceil(capacity / 2);

  if (shape.includes("rectangle")) {
    let seatNum = 1;

    // Left side
    for (let i = 0; i < halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.5,
        relativeY: -0.35 + (i / (halfCapacity - 1 || 1)) * 0.7,
        angle: 90,
      });
    }

    // Right side
    for (let i = 0; i < capacity - halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.5,
        relativeY: -0.35 + (i / (capacity - halfCapacity - 1 || 1)) * 0.7,
        angle: 270,
      });
    }
  } else {
    // Fall back to even distribution
    return calculateEvenDistribution(capacity, shape);
  }

  return seats;
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
