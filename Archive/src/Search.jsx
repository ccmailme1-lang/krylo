import React from 'react';
import { useEcosystem } from './App.jsx';

const ITEMS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

export default function Search() {
  const { setSearchSelection } = useEcosystem();

  return (
    <div className="search">
      <h2>Search Bridge</h2>
      {ITEMS.map((item) => (
        <button key={item} onClick={() => setSearchSelection(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}