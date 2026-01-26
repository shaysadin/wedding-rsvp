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
 * @param capacity - Number of seats
 * @param shape - Table shape
 * @param arrangement - Seating arrangement type
 * @param tableWidth - Optional table width in pixels (for pixel-accurate spacing)
 * @param tableHeight - Optional table height in pixels (for pixel-accurate spacing)
 */
export function calculateSeatPositions(
  capacity: number,
  shape: TableShape,
  arrangement: SeatingArrangement = "even",
  tableWidth?: number,
  tableHeight?: number
): SeatPosition[] {
  switch (arrangement) {
    case "even":
      return calculateEvenDistribution(capacity, shape, tableWidth, tableHeight);
    case "bride-side":
      return calculateBrideSideDistribution(capacity, shape);
    case "sides-only":
      return calculateSidesOnlyDistribution(capacity, shape);
    case "custom":
      // Return default even distribution - user will customize
      return calculateEvenDistribution(capacity, shape, tableWidth, tableHeight);
    default:
      return calculateEvenDistribution(capacity, shape, tableWidth, tableHeight);
  }
}

/**
 * Target gap between chairs in pixels
 */
const TARGET_GAP = 2;

/**
 * Distance multiplier used in table-with-seats.tsx to push chairs outside the table
 */
const DISTANCE_MULTIPLIER = 1.15;

/**
 * Max span across a side (in relative coordinates)
 */
const MAX_SPAN = 0.9;

/**
 * Calculate chair size for a given table dimension
 * Must match the formula in table-with-seats.tsx
 */
function calculateChairSize(minDim: number): number {
  const MIN_CHAIR_SIZE = 13;
  const MAX_CHAIR_SIZE = 22;
  const size = Math.round(minDim * 0.24);
  return Math.max(MIN_CHAIR_SIZE, Math.min(MAX_CHAIR_SIZE, size));
}

/**
 * Calculate pixel-accurate spacing for chairs on a side
 * @param numChairs - Number of chairs on this side
 * @param sideDimension - Pixel dimension of this side (width or height)
 * @param minTableDim - Minimum table dimension (for chair size calculation)
 * @returns Spacing in relative coordinates
 */
function getPixelAccurateSpacing(
  numChairs: number,
  sideDimension: number,
  minTableDim: number
): { start: number; spacing: number } {
  if (numChairs <= 0) return { start: 0, spacing: 0 };
  if (numChairs === 1) return { start: 0, spacing: 0 };

  const chairSize = calculateChairSize(minTableDim);

  // Target pixel spacing = chairSize + gap
  const targetPixelSpacing = chairSize + TARGET_GAP;

  // Convert to relative spacing (accounting for distance multiplier)
  let spacing = targetPixelSpacing / (sideDimension * DISTANCE_MULTIPLIER);
  let totalSpan = (numChairs - 1) * spacing;

  // If span exceeds max, scale down
  if (totalSpan > MAX_SPAN) {
    spacing = MAX_SPAN / (numChairs - 1);
    totalSpan = MAX_SPAN;
  }

  const start = -totalSpan / 2;
  return { start, spacing };
}

/**
 * Fallback spacing when table dimensions are not provided
 */
function getFallbackSpacing(numChairs: number): { start: number; spacing: number } {
  if (numChairs <= 0) return { start: 0, spacing: 0 };
  if (numChairs === 1) return { start: 0, spacing: 0 };

  // Use a reasonable default spacing
  const spacing = 0.18;
  let totalSpan = (numChairs - 1) * spacing;

  if (totalSpan > MAX_SPAN) {
    const adjustedSpacing = MAX_SPAN / (numChairs - 1);
    return { start: -MAX_SPAN / 2, spacing: adjustedSpacing };
  }

  return { start: -totalSpan / 2, spacing };
}

/**
 * Even distribution based on shape:
 * - Square: seats on all 4 sides
 * - Circle: seats around the circumference
 * - Rectangle: seats on all sides (more on long sides)
 * - Oval: seats around the ellipse perimeter
 */
function calculateEvenDistribution(
  capacity: number,
  shape: TableShape,
  tableWidth?: number,
  tableHeight?: number
): SeatPosition[] {
  const seats: SeatPosition[] = [];

  // Helper to get spacing - uses pixel-accurate if dimensions provided
  const getSpacing = (numChairs: number, sideDimension?: number) => {
    if (tableWidth && tableHeight && sideDimension) {
      const minDim = Math.min(tableWidth, tableHeight);
      return getPixelAccurateSpacing(numChairs, sideDimension, minDim);
    }
    return getFallbackSpacing(numChairs);
  };

  if (shape === "circle") {
    // Distribute evenly around circle
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * 360;
      const radians = (angle - 90) * (Math.PI / 180); // Start at top

      seats.push({
        seatNumber: i + 1,
        relativeX: Math.cos(radians) * 0.5,
        relativeY: Math.sin(radians) * 0.5,
        angle: angle,
      });
    }
  } else if (shape === "square") {
    // Seats distributed on all 4 sides, keeping parallel sides equal
    const basePerSide = Math.floor(capacity / 4);
    const remainder = capacity % 4;

    let topSeats = basePerSide;
    let bottomSeats = basePerSide;
    let leftSeats = basePerSide;
    let rightSeats = basePerSide;

    // Distribute remainder to keep parallel sides equal
    if (remainder >= 2) {
      topSeats += 1;
      bottomSeats += 1;
    }
    if (remainder === 1) {
      topSeats += 1;
    }
    if (remainder === 3) {
      topSeats += 1;
      bottomSeats += 1;
      leftSeats += 1;
    }

    let seatNum = 1;

    // Top side (horizontal, uses width)
    const top = getSpacing(topSeats, tableWidth);
    for (let i = 0; i < topSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: topSeats === 1 ? 0 : top.start + i * top.spacing,
        relativeY: -0.5,
        angle: 0,
      });
    }

    // Right side (vertical, uses height)
    const right = getSpacing(rightSeats, tableHeight);
    for (let i = 0; i < rightSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.5,
        relativeY: rightSeats === 1 ? 0 : right.start + i * right.spacing,
        angle: 90,
      });
    }

    // Bottom side (horizontal, uses width, reverse order)
    const bottom = getSpacing(bottomSeats, tableWidth);
    for (let i = 0; i < bottomSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: bottomSeats === 1 ? 0 : -bottom.start - i * bottom.spacing,
        relativeY: 0.5,
        angle: 180,
      });
    }

    // Left side (vertical, uses height, reverse order)
    const left = getSpacing(leftSeats, tableHeight);
    for (let i = 0; i < leftSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.5,
        relativeY: leftSeats === 1 ? 0 : -left.start - i * left.spacing,
        angle: 270,
      });
    }
  } else if (shape === "rectangle") {
    // Stadium shape: chairs on short sides depend on capacity
    // More than 24 guests = 3 chairs per short side, otherwise 2
    const maxShortSideSeats = capacity > 24 ? 3 : 2;
    const shortSideSeats = Math.min(maxShortSideSeats, Math.floor(capacity / 4));
    const remainingSeats = capacity - (shortSideSeats * 2);
    const topSeats = Math.ceil(remainingSeats / 2);
    const bottomSeats = remainingSeats - topSeats;

    // ============ STADIUM CHAIR POSITION SETTINGS ============
    // Adjust these values to move chairs closer/further from table edge
    // 0.5 = at edge, lower = closer to center, higher = further out

    // SHORT SIDES (left/right) - per size:
    let sideChairDistance = 0.5;
    if (tableWidth === 140 && tableHeight === 60) {
      sideChairDistance = 0.48; // Medium stadium short sides
    } else if (tableWidth === 180 && tableHeight === 70) {
      sideChairDistance = 0.47; // Large stadium short sides
    }

    // LONG SIDES (top/bottom) - per size:
    let longSideChairDistance = 0.5;
    if (tableWidth === 140 && tableHeight === 60) {
      longSideChairDistance = 0.51; // Medium stadium long sides
    } else if (tableWidth === 180 && tableHeight === 70) {
      longSideChairDistance = 0.5; // Large stadium long sides
    }
    // =========================================================

    let seatNum = 1;

    // Top side (long side, horizontal, uses width)
    const top = getSpacing(topSeats, tableWidth);
    for (let i = 0; i < topSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: topSeats === 1 ? 0 : top.start + i * top.spacing,
        relativeY: -longSideChairDistance,
        angle: 0,
      });
    }

    // Right side (short side, vertical, uses height)
    const right = getSpacing(shortSideSeats, tableHeight);
    for (let i = 0; i < shortSideSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: sideChairDistance,
        relativeY: shortSideSeats === 1 ? 0 : right.start + i * right.spacing,
        angle: 90,
      });
    }

    // Bottom side (long side, horizontal, uses width, reverse order)
    const bottom = getSpacing(bottomSeats, tableWidth);
    for (let i = 0; i < bottomSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: bottomSeats === 1 ? 0 : -bottom.start - i * bottom.spacing,
        relativeY: longSideChairDistance,
        angle: 180,
      });
    }

    // Left side (short side, vertical, uses height, reverse order)
    const left = getSpacing(shortSideSeats, tableHeight);
    for (let i = 0; i < shortSideSeats; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -sideChairDistance,
        relativeY: shortSideSeats === 1 ? 0 : -left.start - i * left.spacing,
        angle: 270,
      });
    }
  } else if (shape === "oval") {
    // Distribute around ellipse perimeter
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * 360;
      const radians = (angle - 90) * (Math.PI / 180);

      seats.push({
        seatNumber: i + 1,
        relativeX: Math.cos(radians) * 0.5,
        relativeY: Math.sin(radians) * 0.5,
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
