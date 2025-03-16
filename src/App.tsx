import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FormulaInput from './FormulaInput';
import './App.css';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <main className="app-main">
          <div className="formula-section">
            <h2>Create Your Formula</h2>
            <FormulaInput />
            <div className="instructions">
              <h3>Instructions:</h3>
              <ul>
                <li>Type variable names and select from suggestions</li>
                <li>Use operators: +, -, *, /, ^, (, )</li>
                <li>Enter numbers directly</li>
                <li>Press Enter to add the current input</li>
                <li>Use Backspace to delete the last token</li>
                <li>Click the dropdown arrow on variables for more options</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
