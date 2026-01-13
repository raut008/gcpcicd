import React, { Component } from "react";
import Documentation from "./components/Documentation";
import ErrorBoundary from "./components/ErrorBoundary";

class App extends Component {
  render() {
    return (
      <ErrorBoundary>
        <Documentation />
      </ErrorBoundary>
    );
  }
}

export default App;
