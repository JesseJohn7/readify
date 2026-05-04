# Readify

![GitHub stars](https://img.shields.io/github/stars/JesseJohn7/readify?style=social) ![GitHub forks](https://img.shields.io/github/forks/JesseJohn7/readify?style=social) ![MIT License](https://img.shields.io/badge/license-MIT-blue)

Readify is a web application that enables you to generate production-ready README files directly from your GitHub repositories.

## Features

- **Generate README Files**: Automatically generates README documentation for your GitHub projects.
- **View Previous Generations**: Access and manage previously generated README documents with ease.
- **User Authentication**: Secure user sessions managed through Supabase.

## Technical Stack

- **Frontend**: React, Next.js
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **Others**: TypeScript

## Installation

To get started with Readify, clone the repository and install the dependencies:

```bash
git clone https://github.com/JesseJohn7/readify.git
cd readify
npm install
```

## Usage

To run the application in development mode, use the following command:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser to view the app.

### Generating a README

The README generation can be accessed through an interface where you can select a GitHub repository. The necessary API calls are handled on the backend, ensuring user authentication through Supabase.

#### API Endpoints

**GET /api/repos**  
Fetches the user's GitHub repositories (requires authentication).

**GET /api/history**  
Retrieves the history of previously generated README files for the authenticated user.

**DELETE /api/history**  
Deletes a selected README history entry of the authenticated user.

## Roadmap

- Improve UI/UX based on user feedback.
- Implement additional features for README customization.
- Support for more markdown elements in the generated READMEs.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. 

## Demo

You can view a live demo of Readify at [readify-delta.vercel.app](https://readify-delta.vercel.app).

## Contributing

Contributions are welcome! Please submit a pull request for any changes or enhancements.