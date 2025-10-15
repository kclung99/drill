# Archived AI Image Generation Services

Modular, single-purpose services for AI image generation. Each service does one thing well.

## 📦 Architecture

```
Simple, Focused Services:

├── imageGenerationService.ts    → Call AI APIs
├── generatedImagesService.ts    → Database CRUD
├── promptGenerator.ts           → Generate prompts
├── retryHelper.ts               → Shared retry logic
├── batchImageGenerator.ts       → Batch generation
├── poseExtractor.ts             → Pose extraction
└── clothingGenerator.ts         → Add clothing
```

## 📁 Services

### 1. `imageGenerationService.ts`
**What it does**: Calls AI model APIs

```typescript
import { ImageGenerationService } from './imageGenerationService';

const service = new ImageGenerationService();

// Generate image
const result = await service.generateImage({
  prompt: "A full body pose",
  model: 'gemini-2.5-flash-image',
  generationType: 'text-to-image'
});

// Check model support
const canDoImg2Img = service.supportsImageToImage('gemini-2.5-flash-image'); // true
const models = service.getAvailableModels();
```

**Models**: Ideogram, Gemini, Nano Banana, FLUX Kontext
**API**: `generateImage()`, `setDefaultModel()`, `supportsImageToImage()`, `getAvailableModels()`

---

### 2. `generatedImagesService.ts`
**What it does**: Database operations for `drawing_images` table

```typescript
import { GeneratedImagesService } from './generatedImagesService';

const service = new GeneratedImagesService();

// Create image record
const image = await service.create({
  imageUrl: 'https://...',
  storagePath: 'path/to/image.jpg',
  prompt: "...",
  category: 'full-body',
  subjectType: 'female',
  clothingState: 'minimal',
  attributes: { body_type: 'athletic', race: 'Asian', pose: 'standing' },
  model: 'gemini-2.5-flash-image',
  generationType: 'text-to-image'
});

// Query images
const images = await service.getByFilters({ category: 'full-body', limit: 10 });

// Get least-used for sessions
const sessionImages = await service.getLeastUsed(10, 'full-body', 'female', 'minimal');

// Delete images (includes storage cleanup)
await service.deleteByIds(['id1', 'id2']);

// Track usage
await service.incrementUsageCount(['id1', 'id2']);

// Upload image
const storagePath = await service.uploadToStorage(imageUrl);

// Get stats
const stats = await service.getStats(); // { total: 150, recent: 12 }
```

**API**: `create()`, `getByFilters()`, `getLeastUsed()`, `getById()`, `deleteByIds()`, `incrementUsageCount()`, `uploadToStorage()`, `getStats()`

---

### 3. `promptGenerator.ts`
**What it does**: Generate random drawing prompts

```typescript
import { generateDrawingPrompt, generateBatchPrompts } from './promptGenerator';

// Single prompt
const { prompt, bodyType, race, pose } = generateDrawingPrompt(
  'full-body',
  'female',
  'minimal'
);

// Batch prompts
const prompts = generateBatchPrompts(10, 'full-body', 'female', 'minimal');
```

**Categories**: `full-body`, `hands`, `feet`, `portraits`
**API**: `generateDrawingPrompt()`, `generateBatchPrompts()`
**Exports**: `BODY_TYPES`, `RACES`, `POSES`, `HAND_GESTURES`, `FOOT_ANGLES`

---

### 4. `retryHelper.ts`
**What it does**: Shared retry logic with error handling

```typescript
import { withRetry } from './retryHelper';

// Use in any async operation
const result = await withRetry(
  async () => {
    // Your operation here
    return await someAsyncOperation();
  },
  {
    maxRetries: 2,
    retryOnContentFilter: true,
    onAttempt: (attempt, max) => {
      console.log(`Retry ${attempt}/${max}...`);
    },
    onError: (error, errorType, attempt) => {
      if (errorType === 'CONTENT_FILTERED') {
        console.warn('Content filtered');
      }
    }
  }
);
```

**Features**:
- Automatic error classification (content filtering, API errors, etc.)
- Configurable retry behavior
- Callbacks for logging
- Type-safe error handling

**API**: `withRetry(operation, config)`, `isContentFilteredError()`, `classifyError()`

---

### 5. `batchImageGenerator.ts`
**What it does**: Generate multiple images in parallel

```typescript
import { generateBatchImages } from './batchImageGenerator';

const images = await generateBatchImages(
  10,                    // count
  'full-body',          // category
  'female',             // gender
  'minimal',            // clothing
  'gemini-2.5-flash-image'  // model
);

// Returns DrawingImage[]
```

**Simple, focused function** - handles prompt generation, API calls, storage upload, and database save all in one.

---

### 6. `poseExtractor.ts`
**What it does**: Extract pose from reference and generate new image

```typescript
import { extractPoseAndGenerate } from './poseExtractor';

const image = await extractPoseAndGenerate(
  dataUrl,               // base64 data URL
  'female',              // gender
  'google/nano-banana',  // model
  2                      // max retries
);

// Returns DrawingImage with pose extracted
```

**Features**: Uses `retryHelper` for robust error handling, content filtering detection, gender-specific prompts

---

### 7. `clothingGenerator.ts`
**What it does**: Add clothing to minimal clothing images

```typescript
import { generateClothedVersion, generateClothedVersions } from './clothingGenerator';

// Single image with retry
const clothedImage = await generateClothedVersion(baseImage, 2);

// Multiple images in parallel with retry
const clothedImages = await generateClothedVersions([img1, img2, img3], 2);
```

**Features**: Uses `retryHelper` for robust error handling, 10 random clothing styles (casual, business, athletic, etc.)

---

## 🔌 Restoration Guide

### Quick Restore

```bash
# Move files back
mv app/services/archived/*.ts app/services/
mv app/services/promptGenerator.ts app/utils/
```

### Usage Examples

**Generate images:**
```typescript
import { generateBatchImages } from '@/app/services/batchImageGenerator';

const images = await generateBatchImages(5, 'full-body', 'female', 'minimal');
```

**Extract pose:**
```typescript
import { extractPoseAndGenerate } from '@/app/services/poseExtractor';

const image = await extractPoseAndGenerate(poseDataUrl, 'female');
```

**Add clothing:**
```typescript
import { generateClothedVersions } from '@/app/services/clothingGenerator';

const clothedImages = await generateClothedVersions(baseImages);
```

**Query images:**
```typescript
import { GeneratedImagesService } from '@/app/services/generatedImagesService';

const service = new GeneratedImagesService();
const images = await service.getByFilters({ category: 'full-body' });
```

**Generate custom prompt:**
```typescript
import { generateDrawingPrompt } from '@/app/utils/promptGenerator';

const { prompt } = generateDrawingPrompt('hands', 'male', 'minimal');
```

---

## 🎯 Design Philosophy

✅ **Single Responsibility** - Each service does ONE thing
✅ **Simple Functions** - Minimal APIs, easy to understand
✅ **No Orchestration** - Compose services yourself as needed
✅ **Stateless** - No complex state management
✅ **Independent** - Services don't depend on each other
✅ **Type-Safe** - Full TypeScript support

---

## 📋 Prerequisites

### API Endpoints
- `/api/generate-image` (Ideogram)
- `/api/generate-image-gemini` (Gemini)
- `/api/generate-image-nano-banana` (Nano Banana)
- `/api/generate-image-flux-kontext` (FLUX)

### Environment Variables
```env
IDEOGRAM_API_KEY=...
GOOGLE_GEMINI_API_KEY=...
```

### Database
Table: `drawing_images`
RPC: `increment_image_usage(image_id uuid)`

---

## 🧪 Testing

```typescript
// Test generation
import { ImageGenerationService } from './imageGenerationService';
const service = new ImageGenerationService();
const result = await service.generateImage({
  prompt: "Test image",
  model: 'gemini-2.5-flash-image'
});

// Test database
import { GeneratedImagesService } from './generatedImagesService';
const imgService = new GeneratedImagesService();
const images = await imgService.getByFilters({ limit: 5 });

// Test prompt generation
import { generateDrawingPrompt } from './promptGenerator';
const { prompt } = generateDrawingPrompt('full-body', 'female', 'minimal');
```

---

## 💡 Example Workflows

**Workflow 1: Generate session images**
```typescript
import { generateBatchImages } from './batchImageGenerator';
const images = await generateBatchImages(10, 'full-body', 'female', 'minimal');
```

**Workflow 2: Extract poses from refs**
```typescript
import { extractPoseAndGenerate } from './poseExtractor';
const images = await Promise.all(
  refImages.map(ref => extractPoseAndGenerate(ref.dataUrl, ref.gender))
);
```

**Workflow 3: Create clothed versions**
```typescript
import { GeneratedImagesService } from './generatedImagesService';
import { generateClothedVersions } from './clothingGenerator';

const service = new GeneratedImagesService();
const minimalImages = await service.getByFilters({ clothingState: 'minimal', limit: 10 });
const clothedImages = await generateClothedVersions(minimalImages);
```

**Workflow 4: Custom pipeline**
```typescript
import { ImageGenerationService } from './imageGenerationService';
import { GeneratedImagesService } from './generatedImagesService';
import { generateDrawingPrompt } from './promptGenerator';

// Generate prompt
const { prompt, bodyType, race, pose } = generateDrawingPrompt('portraits', 'male', 'minimal');

// Generate image
const genService = new ImageGenerationService();
const result = await genService.generateImage({ prompt, model: 'gemini-2.5-flash-image' });

// Save to database
const imgService = new GeneratedImagesService();
const storagePath = await imgService.uploadToStorage(result.imageUrl);
const image = await imgService.create({
  imageUrl: result.imageUrl,
  storagePath,
  prompt,
  category: 'portraits',
  subjectType: 'male',
  clothingState: 'minimal',
  attributes: { body_type: bodyType, race, pose },
  model: result.model,
  generationType: result.generationType
});
```

---

## 🔄 Migration Notes

**No backward compatibility needed** - these are brand new simple services. Use them however you want!

Mix and match services to build your own workflows. Each service is independent and focused.
