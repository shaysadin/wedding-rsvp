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
    // Seats equally divided on all 4 sides, tightly packed next to each other
    const seatsPerSide = Math.floor(capacity / 4);
    const remainder = capacity % 4;

    // Distribute remainder seats to sides (top, right, bottom, left)
    const topSeats = seatsPerSide + (remainder > 0 ? 1 : 0);
    const rightSeats = seatsPerSide + (remainder > 1 ? 1 : 0);
    const bottomSeats = seatsPerSide + (remainder > 2 ? 1 : 0);
    const leftSeats = seatsPerSide + (remainder > 3 ? 1 : 0);

    let seatNum = 1;
    const chairSpacing = 0.18; // Tight spacing between chairs

    // Top side (chairs facing down toward table) - centered and tight
    const topWidth = (topSeats - 1) * chairSpacing;
    const topStartX = -topWidth / 2;
    for (let i = 0; i < topSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: topSeats === 1 ? 0 : topStartX + i * chairSpacing,
        relativeY: -0.5,
        angle: 0,
      });
    }

    // Right side (chairs facing left toward table) - centered and tight
    const rightHeight = (rightSeats - 1) * chairSpacing;
    const rightStartY = -rightHeight / 2;
    for (let i = 0; i < rightSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.5,
        relativeY: rightSeats === 1 ? 0 : rightStartY + i * chairSpacing,
        angle: 90,
      });
    }

    // Bottom side (chairs facing up toward table) - centered and tight
    const bottomWidth = (bottomSeats - 1) * chairSpacing;
    const bottomStartX = bottomWidth / 2;
    for (let i = 0; i < bottomSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: bottomSeats === 1 ? 0 : bottomStartX - i * chairSpacing,
        relativeY: 0.5,
        angle: 180,
      });
    }

    // Left side (chairs facing right toward table) - centered and tight
    const leftHeight = (leftSeats - 1) * chairSpacing;
    const leftStartY = leftHeight / 2;
    for (let i = 0; i < leftSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.5,
        relativeY: leftSeats === 1 ? 0 : leftStartY - i * chairSpacing,
        angle: 270,
      });
    }
  } else if (shape === "rectangle") {
    // For rectangle (stadium shape): 2 chairs on each short side, rest on long sides
    // Short sides are left and right, long sides are top and bottom
    const shortSideSeats = Math.min(2, Math.floor(capacity / 4)); // Max 2 per short side
    const remainingSeats = capacity - (shortSideSeats * 2); // Seats for long sides
    const topSeats = Math.ceil(remainingSeats / 2);
    const bottomSeats = remainingSeats - topSeats;

    let seatNum = 1;
    const chairSpacing = 0.18; // Same spacing as square for consistency

    // Top side (long side - chairs facing down toward table)
    for (let i = 0; i < topSeats; i++) {
      const spacing = topSeats > 1 ? (i / (topSeats - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.4 + spacing * 0.8,
        relativeY: -0.5,
        angle: 0,
      });
    }

    // Right side (short side - more gap, slightly closer to table)
    const shortSideSpacing = 0.25; // More gap between chairs
    const rightHeight = (shortSideSeats - 1) * shortSideSpacing;
    const rightStartY = -rightHeight / 2;
    for (let i = 0; i < shortSideSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.46, // Slightly closer to table
        relativeY: shortSideSeats === 1 ? 0 : rightStartY + i * shortSideSpacing,
        angle: 90,
      });
    }

    // Bottom side (long side - chairs facing up toward table)
    for (let i = 0; i < bottomSeats; i++) {
      const spacing = bottomSeats > 1 ? (i / (bottomSeats - 1)) : 0.5;
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.4 - spacing * 0.8,
        relativeY: 0.5,
        angle: 180,
      });
    }

    // Left side (short side - more gap, slightly closer to table)
    const leftHeight = (shortSideSeats - 1) * shortSideSpacing;
    const leftStartY = leftHeight / 2;
    for (let i = 0; i < shortSideSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.46, // Slightly closer to table
        relativeY: shortSideSeats === 1 ? 0 : leftStartY - i * shortSideSpacing,
        angle: 270,
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
