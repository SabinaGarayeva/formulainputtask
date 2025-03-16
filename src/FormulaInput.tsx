import React, { useState, useRef, useEffect } from "react";
import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "./FormulaInput.css";

// Zustand store types
type FormulaItem = {
  type: string;
  value: string | number;
  name?: string;
  id?: string;
};

type FormulaStore = {
  formula: FormulaItem[];
  addItem: (item: FormulaItem) => void;
  updateItem: (index: number, item: FormulaItem) => void;
  removeItem: (index: number) => void;
  clearFormula: () => void;
};

// Zustand store
const useFormulaStore = create<FormulaStore>((set) => ({
  formula: [],
  addItem: (item) =>
    set((state) => ({
      formula: [...state.formula, item],
    })),
  updateItem: (index, item) =>
    set((state) => {
      const newFormula = [...state.formula];
      newFormula[index] = item;
      return { formula: newFormula };
    }),
  removeItem: (index) =>
    set((state) => {
      const newFormula = [...state.formula].filter((_, i) => i !== index);
      return { formula: newFormula };
    }),
  clearFormula: () => set({ formula: [] }),
}));

const fetchSuggestions = async (query: string) => {
  try {
    const response = await axios.get(
      `https://652f91320b8d8ddac0b2b62b.mockapi.io/autocomplete`,
      {
        params: { query },
      }
    );

    return response.data.filter((item: { name: string }) =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

const TOKEN_TYPES = {
  VARIABLE: "variable",
  OPERATOR: "operator",
  NUMBER: "number",
  TEXT: "text",
};

const OPERATORS = ["+", "-", "*", "/", "^", "(", ")"];

const FormulaInput: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>("");
  const [, setCursorPosition] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(0);
  const [dropdownActiveFor, setDropdownActiveFor] = useState<number | null>(
    null
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { formula, addItem, removeItem } = useFormulaStore();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["suggestions", inputValue],
    queryFn: () => fetchSuggestions(inputValue),
    enabled: showSuggestions,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setCursorPosition(e.target.selectionStart!);

    if (value.trim() !== "") {
      setShowSuggestions(true);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
        if (showSuggestions && suggestions.length > 0) {
          selectSuggestion(suggestions[selectedSuggestion]);
          e.preventDefault();
        } else if (inputValue.trim()) {
          const numericValue = parseFloat(inputValue);
          if (!isNaN(numericValue)) {
            addItem({ type: TOKEN_TYPES.NUMBER, value: numericValue });
          } else if (OPERATORS.includes(inputValue.trim())) {
            addItem({ type: TOKEN_TYPES.OPERATOR, value: inputValue.trim() });
          } else {
            addItem({ type: TOKEN_TYPES.TEXT, value: inputValue.trim() });
          }
          setInputValue("");
          setShowSuggestions(false);
        }
        break;

      case "ArrowUp":
        if (showSuggestions) {
          setSelectedSuggestion((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          e.preventDefault();
        }
        break;

      case "ArrowDown":
        if (showSuggestions) {
          setSelectedSuggestion((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          e.preventDefault();
        }
        break;

      case "Escape":
        setShowSuggestions(false);
        break;

      case "Backspace":
        if (inputValue === "" && formula.length > 0) {
          removeItem(formula.length - 1);
          e.preventDefault();
        }
        break;

      case "+":
      case "-":
      case "*":
      case "/":
      case "^":
      case "(":
      case ")":
        if (inputValue.trim()) {
          if (inputValue.trim() !== "") {
            const numericValue = parseFloat(inputValue);
            if (!isNaN(numericValue)) {
              addItem({ type: TOKEN_TYPES.NUMBER, value: numericValue });
            } else {
              addItem({ type: TOKEN_TYPES.TEXT, value: inputValue.trim() });
            }
          }
        }
        addItem({ type: TOKEN_TYPES.OPERATOR, value: e.key });
        setInputValue("");
        setShowSuggestions(false);
        e.preventDefault();
        break;

      default:
        break;
    }
  };

  const selectSuggestion = (suggestion: { id: string; name: string }) => {
    addItem({
      type: TOKEN_TYPES.VARIABLE,
      id: suggestion.id,
      name: suggestion.name,
      value: 0,
    });
    setInputValue("");
    setShowSuggestions(false);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if event.target is not null
      if (
        suggestionsRef.current &&
        !(
          event.target instanceof Node &&
          suggestionsRef.current.contains(event.target)
        ) &&
        !(inputRef.current && inputRef.current.contains(event.target as Node))
      ) {
        setShowSuggestions(false);
      }

      if (
        dropdownActiveFor !== null &&
        !(
          event.target instanceof Element &&
          event.target.closest(".token-dropdown")
        )
      ) {
        setDropdownActiveFor(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownActiveFor]);

  const toggleDropdown = (index: number) => {
    setDropdownActiveFor(dropdownActiveFor === index ? null : index);
  };

  const evaluateFormula = () => {
    try {
      let expressionString = formula
        .map((token) => {
          if (token.type === TOKEN_TYPES.VARIABLE) return token.value;
          if (token.type === TOKEN_TYPES.NUMBER) return token.value;
          if (token.type === TOKEN_TYPES.OPERATOR) return token.value;
          return 0;
        })
        .join(" ");

      return eval(expressionString);
    } catch (error) {
      return "Error";
    }
  };

  return (
    <div className="formula-container">
      <div className="formula-input-area">
        <div className="formula-tokens">
          {formula.map((item, index) => (
            <div key={index} className="token-wrapper">
              <div className={`token token-${item.type}`}>
                {item.type === TOKEN_TYPES.VARIABLE && (
                  <>
                    {item.name}
                    <span
                      className="token-dropdown-trigger"
                      onClick={() => toggleDropdown(index)}
                    >
                      ▼
                    </span>
                    {dropdownActiveFor === index && (
                      <div className="token-dropdown">
                        <div className="dropdown-item">Edit</div>
                        <div className="dropdown-item">Delete</div>
                        <div className="dropdown-item">Properties</div>
                      </div>
                    )}
                  </>
                )}
                {item.type === TOKEN_TYPES.OPERATOR && item.value}
                {item.type === TOKEN_TYPES.NUMBER && item.value}
                {item.type === TOKEN_TYPES.TEXT && item.value}
              </div>
            </div>
          ))}
          <input
            ref={inputRef}
            type="text"
            className="formula-text-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              formula.length === 0 ? "Start typing a formula..." : ""
            }
            autoFocus
          />
        </div>

        {showSuggestions && (
          <div className="suggestions-container" ref={suggestionsRef}>
            {isLoading ? (
              <div className="suggestion-loading">Loading...</div>
            ) : suggestions.length > 0 ? (
              <ul className="suggestions-list">
                {suggestions.map(
                  (suggestion: { id: string; name: string }, index: number) => (
                    <li
                      key={suggestion.id}
                      className={`suggestion-item ${
                        index === selectedSuggestion ? "selected" : ""
                      }`}
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion.name}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <div className="no-suggestions">No suggestions</div>
            )}
          </div>
        )}
      </div>
      <div className="formula-output">
        <button
          className="clear-btn"
          onClick={() => useFormulaStore.setState({ formula: [] })}
        >
          Clear
        </button>
        <div className="formula-result">
          <p>Result: {evaluateFormula()}</p>
        </div>
      </div>
    </div>
  );
};

export default FormulaInput;
