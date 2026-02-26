import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        date: z.string(),
        author: z.string().optional(),
        image: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    }),
    catalog: defineCollection({
      type: 'page',
      source: 'catalog/**/*.md',
      schema: z.object({
        description: z.string().optional(),
        status: z.enum(['considering', 'planned', 'in-progress', 'shipped']).optional(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        complexity: z.enum(['S', 'M', 'L', 'XL']).optional(),
        competitors: z.record(z.string(), z.enum(['poor', 'okay', 'good', 'excellent'])).optional(),
      }),
    }),
  },
})
