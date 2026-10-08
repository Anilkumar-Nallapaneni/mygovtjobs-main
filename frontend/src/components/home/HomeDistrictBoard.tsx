import { useDeferredValue, useState } from "react";
import { useIndiaDistrictDirectory } from "@/hooks/useIndiaExplorer";

type HomeDistrictBoardProps = {
  stateId: string | null;
  stateName: string;
  onStateSelect: (stateId: string) => void;
};

export default function HomeDistrictBoard({ stateId, stateName, onStateSelect }: HomeDistrictBoardProps) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const deferred = useDeferredValue(query.trim());
  const { data, loading, error } = useIndiaDistrictDirectory({
    stateId: stateId || undefined,
    q: deferred,
    limit: stateId ? 80 : 36,
  });
  const items = data?.items ?? [];

  return (
    <section className="home-district-board" id="home-districts" aria-label={stateName ? `Districts in ${stateName}` : "Districts at a glance"}>
      <header className="home-district-board__head">
        <h2 className="india-glance__title">{stateName ? `Districts in ${stateName}` : "Districts at a glance"}</h2>
        <p>{stateName ? "Verified districts for the state selected on the map." : "Search a district to select its state on this map."}</p>
      </header>
      <label className="home-district-board__search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={stateName ? `Search districts in ${stateName}` : "Search district or state"}
          aria-label={stateName ? `Search districts in ${stateName}` : "Search district or state"}
        />
      </label>
      {loading ? <p role="status">Loading verified districts…</p> : null}
      {error ? <p role="status">Verified districts are unavailable right now.</p> : null}
      {!loading && !error && items.length === 0 ? <p role="status">No verified districts match this search.</p> : null}
      <ul className="home-district-board__grid">
        {items.map((district) => {
          const open = openId === district.id;
          return (
            <li key={district.id}>
              <button
                type="button"
                className={open ? "is-open" : undefined}
                aria-pressed={open}
                onClick={() => {
                  if (!stateId && district.state_id) onStateSelect(district.state_id);
                  setOpenId(open ? null : district.id);
                }}
              >
                <strong>{district.name}</strong>
                <span>{district.state_name || stateName}</span>
                {district.city_count ? <small>{district.city_count} verified cities</small> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
