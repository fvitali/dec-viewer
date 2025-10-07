# DEC Viewer

A web-based viewer for DEC (Doxastic, Epistemic, and Conjectural) reasoning. This application provides an interactive interface for visualizing and querying RDF data with support for doxastic, epistemic, and conjectural statements, and disagreement analysis.

## What is DEC Reasoning?

DEC (Doxastic, Epistemic, and Conjectural) reasoning is a framework for representing and analyzing different types of knowledge and belief states based on modal logic:

- **Doxastic worlds** represent agents' arbitrary viewpoints regardless of their alignment to actual facts;
- **Epistemic worlds**: represent agents' knowledge, i.e., possibly partial, but factually correct viewpoints;  
- **Conjectural worlds**: represent agents' hypothesis, i.e., extensions of actual facts that are currently neither true nor false, but are assumed to be for the purpose of the reasoning.  

The DEC Viewer allows you to explore datasets that contain these different types of statements and their relationships.

## Features

- Interactive SPARQL query interface
- Visual representation of doxastic, epistemic and conjectural worlds
- Support for RDF-star (quoted triples)
- Disagreement analysis and visualization
- Customizable prefixes and labels
- Export capabilities for query results

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- A running DEC Reasoner instance (see [dec-reasoner](https://github.com/fvitali/dec-reasoner))

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fvitali/dec-viewer.git
   cd dec-viewer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the SPARQL endpoint:**
   Edit `public/config.js` to point to your DEC Reasoner instance:
   ```javascript
   const CONFIG = {
       SPARQL_ENDPOINT: "http://your-reasoner-host:3030/dec/sparql",
       UPDATE_ENDPOINT: "http://your-reasoner-host:3030/dec/update"
   };
   ```

4. **Start the server:**
   ```bash
   node server.js
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### Basic Querying

1. Enter your SPARQL query in the query editor
2. Click "Execute Query" to run the query against your DEC dataset
3. Results will be displayed in both tabular and visual formats

### Working with Examples

The application includes several example queries that demonstrate DEC reasoning concepts:

- Navigate to the "Examples" section to see pre-built queries
- Click "Try" on any example to execute it
- Click "Edit" to modify an example query

### Customizing Display

- **Prefixes**: Define namespace prefixes in the "Prefixes" section for cleaner query writing
- **Labels**: Add human-readable labels for URIs in the "Labels" section  
- **Render Style**: Choose between full URIs, prefixed URIs, or labels for display

## Project Structure

```
dec-viewer/
├── public/
│   ├── app.js          # Main application logic
│   ├── main.js         # Application initialization
│   ├── ui.js           # User interface handlers
│   ├── utils.js        # Utility functions
│   ├── config.js       # Configuration settings
│   ├── viewer.css      # Styles
│   ├── index.html      # Main HTML page
│   ├── examples.html   # Example queries
│   ├── info.html       # Documentation
│   ├── labels.json     # Default labels
│   └── prefixes.txt    # Default prefixes
├── server.js           # Node.js server
├── datasetName.js      # Dataset name generation
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Configuration

### Environment Variables

- `FUSEKI_URL`: URL of the DEC Reasoner SPARQL endpoint (default: http://localhost:3030)
- `PORT`: Port for the web server (default: 3000)

### Custom Styling

The application uses CSS custom properties for theming. You can customize colors and styles by modifying the CSS variables in `public/viewer.css`.

## Integration with DEC Reasoner

This viewer is designed to work with the [DEC Reasoner](https://github.com/fvitali/dec-reasoner), which provides:

- SPARQL endpoint with DEC reasoning capabilities
- Support for epistemic worlds and conjectural statements
- RDF-star processing
- Disagreement detection and analysis

Make sure you have a DEC Reasoner instance running before using this viewer.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or contributions, please visit the [GitHub repository](https://github.com/fvitali/dec-viewer) or contact the maintainers.
