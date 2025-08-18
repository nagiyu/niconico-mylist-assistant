# niconico-mylist-assistant

Niconico MyList Assistant is a multi-component application consisting of a Next.js web application (manager), a Python Lambda function (register), and shared TypeScript utilities (common). The application helps users manage their niconico video playlists.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build the Repository
- Install dependencies and build all components:
  ```bash
  # Build common library first (required by manager)
  cd common && npm install && npm run build
  
  # Build manager application  
  cd ../manager && npm install && npm run build
  
  # Install Python dependencies for register
  cd ../register && pip3 install -r requirements.txt
  ```
- **Build times**: Common builds in <1 second. Manager npm install takes ~40 seconds, build takes ~15 seconds. Python pip install takes ~60 seconds. NEVER CANCEL - Set timeout to 120+ seconds for npm install, 60+ seconds for builds.

### Development Workflow
- Run the Next.js development server:
  ```bash
  cd manager && npm run dev
  ```
  - Starts on http://localhost:3000
  - Hot reload enabled for development
  - Takes ~2 seconds to start

### Testing
- **Manager (TypeScript/Jest)**: 
  ```bash
  cd manager && npm test
  ```
  - Jest configured with Next.js integration
  - Tests may have environment setup issues but framework works
  - Takes ~5-10 seconds to run
  
- **Register (Python/pytest)**:
  ```bash
  cd register && python3 -m pytest tests/ -v
  ```
  - Health check tests pass reliably (~0.2 seconds)
  - Selenium tests may timeout (>5 minutes), run health check tests only: `python3 -m pytest tests/test_health_check.py tests/test_handler.py -v`
  - NEVER CANCEL: Set timeout to 600+ seconds for full test suite

### Linting
- **Manager ESLint**:
  ```bash
  cd manager && npm run lint
  ```
  - Identifies TypeScript and React issues
  - Fix issues with: `npm run lint:fix`
  - **CRITICAL**: Lint errors prevent Docker builds from succeeding
  - Always run `npm run lint:fix` before building Docker images

## Build and Deployment

### Production Builds
- **CRITICAL**: The `npm run build` command will FAIL due to ESLint errors in the current codebase
- This is expected behavior - the instructions document the current state of the repository
- To make builds succeed, ESLint errors in the TypeScript code must be fixed first

### Docker Builds
- **Manager**: 
  ```bash
  # From repository root, not manager directory
  cd manager && ./build_local.sh
  ```
  - NEVER CANCEL: Takes 3-5 minutes. Set timeout to 600+ seconds.
  - **CRITICAL**: Fix all ESLint warnings first or build will fail
  - Requires all ARG variables (can be empty for local testing)

- **Register**:
  ```bash
  cd register && ./build.sh  
  ```
  - NEVER CANCEL: Takes 3-5 minutes. Set timeout to 600+ seconds.
  - May fail due to network connectivity to package repositories

### Manual Build Validation
After any code changes, always run this validation sequence:
1. **Lint check**: `cd manager && npm run lint:fix`
2. **Build check**: `cd manager && npm run build` 
3. **Basic functionality**: Start dev server with `npm run dev` and verify it loads
4. **Test key endpoints**: Test at least one API endpoint (e.g., health check)

## Common Tasks

### Repository Structure
```
niconico-mylist-assistant/
├── .github/workflows/          # CI/CD pipelines
├── common/                     # Shared TypeScript utilities
│   ├── utils/                  # Date and validation helpers
│   └── package.json           # Common library dependencies
├── manager/                    # Next.js web application
│   ├── app/                   # Next.js app directory
│   │   ├── api/              # API routes (register, music, auth)
│   │   ├── components/       # React components
│   │   └── page.tsx          # Main page
│   ├── tests/                # Jest tests
│   ├── public/               # Static assets
│   └── package.json          # Next.js app dependencies
└── register/                  # Python Lambda function
    ├── app/                  # Registration logic
    ├── tests/                # Pytest tests
    ├── handler.py            # Lambda entry point
    └── requirements.txt      # Python dependencies
```

### Key Scripts Reference
```bash
# Manager scripts
npm run dev          # Start development server
npm run build        # Build for production (~15s)
npm run start        # Start production server
npm run test         # Run Jest tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Common scripts  
npm run build        # Build TypeScript library (~1s)

# Register scripts
python3 -m pytest tests/ -v              # Run all tests (may timeout)
python3 -m pytest tests/test_health_check.py -v  # Run quick tests (~0.2s)
```

### Environment Variables
The application requires several environment variables for full functionality:
- **Manager**: NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, etc.
- **Register**: AWS credentials, S3_BUCKET_NAME, SHARED_SECRET_KEY, etc.

For development, these can be empty, but production deployments require proper values.

### Deployment Pipeline
- GitHub Actions automatically deploy on pushes to master/develop
- Manager deploys to AWS Lambda via Docker container
- Register deploys to AWS Lambda via Docker container
- Pipelines include linting, building, and deployment steps

## Validation Scenarios

### After Making Changes
**ALWAYS** test these scenarios after making any changes:

1. **Development server validation**:
   ```bash
   cd manager && npm run dev
   # Verify http://localhost:3000 loads without errors
   # Check browser console for JavaScript errors
   ```

2. **Build validation**:
   ```bash
   cd manager && npm run build
   # EXPECTED TO FAIL due to ESLint errors - this is normal for current codebase
   # Build will succeed only after ESLint errors are fixed
   ```

3. **Lint validation**:
   ```bash
   cd manager && npm run lint
   # Must pass or Docker builds will fail
   ```

4. **Basic API testing**:
   - Test registration endpoint: POST to `/api/register`
   - Verify authentication flows work
   - Check music search functionality

### Known Issues and Workarounds
- **Docker builds fail with lint errors**: Always run `npm run lint:fix` first
- **Jest tests may fail**: Test infrastructure works but some tests have environment issues
- **Selenium tests timeout**: Run only health check tests for faster validation
- **Network issues in Docker**: Expected in sandboxed environments

### Performance Expectations
- **NEVER CANCEL**: Development server startup: ~2 seconds
- **NEVER CANCEL**: Manager build: ~15 seconds  
- **NEVER CANCEL**: Manager npm install: ~40 seconds
- **NEVER CANCEL**: Docker builds: 3-5 minutes (600+ second timeout required)
- **NEVER CANCEL**: Full Python tests: 5+ minutes (600+ second timeout required)

## CI/CD Integration
- Always run `npm run lint` before committing changes
- The CI pipeline will fail if there are linting errors
- All builds must pass before deployment
- GitHub Actions handle automated deployment to AWS

## Troubleshooting
- If dev server fails to start: Check for TypeScript compilation errors
- If tests fail: Verify all dependencies are installed and environment variables are set  
- If Docker build fails: Check lint errors first, then build logs
- If Python tests hang: Use health check tests only for faster validation