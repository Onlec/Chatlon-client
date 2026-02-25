import React, { useState } from 'react';
import { log } from '../../utils/debug';

function CalculatorPane() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const inputPercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const handleSqrt = () => {
    const value = parseFloat(display);
    setDisplay(String(Math.sqrt(value)));
  };

  return (
    <div className="calculator-container">
      <div className="calculator-menubar">
        <span className="calculator-menu-item">Weergave</span>
        <span className="calculator-menu-item">Bewerken</span>
        <span className="calculator-menu-item">Help</span>
      </div>

      <div className="calculator-display">
        <div className="calculator-display-text">{display}</div>
      </div>

      <div className="calculator-buttons">
        <div className="calculator-row">
          <button className="calc-btn calc-btn--memory">MC</button>
          <button className="calc-btn calc-btn--memory">MR</button>
          <button className="calc-btn calc-btn--memory">MS</button>
          <button className="calc-btn calc-btn--memory">M+</button>
        </div>

        <div className="calculator-row">
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(7)}>7</button>
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(8)}>8</button>
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(9)}>9</button>
          <button className="calc-btn calc-btn--operator" onClick={() => performOperation('/')}>/</button>
          <button className="calc-btn calc-btn--operator" onClick={handleSqrt}>√</button>
        </div>

        <div className="calculator-row">
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(4)}>4</button>
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(5)}>5</button>
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(6)}>6</button>
          <button className="calc-btn calc-btn--operator" onClick={() => performOperation('*')}>*</button>
          <button className="calc-btn calc-btn--operator" onClick={inputPercent}>%</button>
        </div>

        <div className="calculator-row">
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(1)}>1</button>
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(2)}>2</button>
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(3)}>3</button>
          <button className="calc-btn calc-btn--operator" onClick={() => performOperation('-')}>-</button>
          <button className="calc-btn calc-btn--operator" onClick={toggleSign}>1/x</button>
        </div>

        <div className="calculator-row">
          <button className="calc-btn calc-btn--function" onClick={() => inputDigit(0)}>0</button>
          <button className="calc-btn calc-btn--operator" onClick={inputDecimal}>,</button>
          <button className="calc-btn calc-btn--operator" onClick={clear}>C</button>
          <button className="calc-btn calc-btn--operator" onClick={() => performOperation('+')}>+</button>
          <button className="calc-btn calc-btn--equals" onClick={handleEquals}>=</button>
        </div>
      </div>
    </div>
  );
}

export default CalculatorPane;
