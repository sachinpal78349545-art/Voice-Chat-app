import { useState } from "react";

interface Props {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className="hp-search-wrap">
      <div className="hp-search-bar">
        <span className="hp-search-icon">{"\u{1F50D}"}</span>
        <input
          type="text"
          placeholder="Search by 9-digit UID..."
          value={value}
          onChange={handleChange}
          className="hp-search-input"
        />
        {value && (
          <button className="hp-search-clear" onClick={() => { setValue(""); onSearch(""); }}>{"\u2715"}</button>
        )}
      </div>
    </div>
  );
}
