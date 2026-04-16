import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Searchable combobox for picking a company from a long list.
 */
export function CompanySelect({ companies, value, onChange }) {
  const listboxId = useId();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return companies;
    }
    return companies.filter((c) => c.toLowerCase().includes(q));
  }, [companies, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    if (highlightIndex >= filtered.length) {
      setHighlightIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, highlightIndex]);

  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return;
    }
    const el = listRef.current.querySelector(
      `[data-option-index="${highlightIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        if (query.trim() === "") {
          onChange("");
        } else {
          setQuery(value || "");
        }
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, value, query, onChange]);

  const selectCompany = (company) => {
    onChange(company);
    setQuery(company);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (
      !isOpen &&
      (event.key === "ArrowDown" || event.key === "ArrowUp")
    ) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        if (!filtered.length) {
          return;
        }
        setIsOpen(true);
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (!filtered.length) {
          return;
        }
        setIsOpen(true);
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (isOpen && filtered.length > 0) {
          selectCompany(filtered[highlightIndex]);
        }
        break;
      }
      case "Escape": {
        event.preventDefault();
        setIsOpen(false);
        setQuery(value || "");
        break;
      }
      default:
        break;
    }
  };

  const disabled = !companies.length;

  const handleQueryInput = (next) => {
    setQuery(next);
    setIsOpen(true);
  };

  return (
    <label className="field company-select" ref={wrapperRef}>
      <span id={`${listboxId}-label`} className="company-select__label">
        Company
      </span>
      <div className="company-select__control">
        <input
          ref={inputRef}
          type="search"
          className="company-select__input"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-labelledby={`${listboxId}-label`}
          aria-activedescendant={
            isOpen && filtered[highlightIndex]
              ? `${listboxId}-option-${highlightIndex}`
              : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          onChange={(event) => handleQueryInput(event.target.value)}
          onInput={(event) => handleQueryInput(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {isOpen ? (
          <ul
            ref={listRef}
            id={listboxId}
            className="company-select__dropdown"
            role="listbox"
            aria-label="Companies"
          >
            {filtered.length === 0 ? (
              <li className="company-select__empty" role="presentation">
                No matching companies
              </li>
            ) : (
              filtered.map((company, index) => (
                <li
                  key={company}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  data-option-index={index}
                  aria-selected={company === value}
                  className={`company-select__option${
                    index === highlightIndex ? " is-highlighted" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectCompany(company)}
                >
                  {company}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </label>
  );
}
