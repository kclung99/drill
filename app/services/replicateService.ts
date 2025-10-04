export class ReplicateService {
  async generateImage(prompt: string): Promise<string> {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
      }

      const { imageUrl } = await response.json();
      return imageUrl;
    } catch (error) {
      console.error('Failed to generate image:', error);
      throw error;
    }
  }
}