import { districtNamesMatch } from "@/data/stateDistricts";

export type DistrictShape = { name: string; d: string };

function pointKeys(path: string): Set<string> {
  const nums = path.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const keys = new Set<string>();
  for (let index = 0; index < nums.length - 1; index += 2) {
    const x = Math.round(Number(nums[index]) * 2) / 2;
    const y = Math.round(Number(nums[index + 1]) * 2) / 2;
    keys.add(`${x},${y}`);
  }
  return keys;
}

/** Districts that share a drawn border with the selected district on this map. */
export function neighboringDistricts(districts: DistrictShape[], selectedName: string): string[] {
  const selected = districts.find((district) => districtNamesMatch(district.name, selectedName));
  if (!selected) return [];
  const selectedPoints = pointKeys(selected.d);
  return districts
    .filter((district) => !districtNamesMatch(district.name, selected.name))
    .map((district) => {
      const points = pointKeys(district.d);
      let shared = 0;
      for (const point of selectedPoints) {
        if (points.has(point)) shared += 1;
        if (shared >= 3) break;
      }
      return { name: district.name, shared };
    })
    .filter((district) => district.shared >= 3)
    .sort((left, right) => right.shared - left.shared || left.name.localeCompare(right.name))
    .map((district) => district.name);
}
