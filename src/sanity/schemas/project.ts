import { defineType, defineField, defineArrayMember } from 'sanity';
import { ProjectsIcon } from '@sanity/icons';
import { ICON_OPTIONS } from '../../utils/icons';

export const project = defineType({
  name: 'project',
  title: 'Proyecto',
  type: 'document',
  icon: ProjectsIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descripción Breve (Card)',
      type: 'text',
      rows: 2,
      description: 'Aparece en la card del proyecto. Sé conciso.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Contenido Detallado (Modal)',
      type: 'array',
      description: 'Descripción detallada con formato que aparecerá en el modal.',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'tags',
      title: 'Tecnologías / Tags',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'link',
      title: 'URL del proyecto',
      type: 'url',
      description: 'Link al sitio desplegado o repositorio',
      validation: (rule) =>
        rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'mainImage',
      title: 'Imagen Principal (Modal)',
      type: 'image',
      description: 'Imagen destacada que aparecerá primero en el modal del proyecto',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
          description: 'Describí la imagen para accesibilidad',
        }),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Galería de Imágenes',
      type: 'array',
      description: 'Imágenes adicionales para el carrusel del modal',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Texto alternativo',
              type: 'string',
              description: 'Describí la imagen para accesibilidad',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'screenshot',
      title: 'Captura (card)',
      type: 'image',
      description: 'Captura real del proyecto para la card. Sin captura se usa el ícono dibujado.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
          description: 'Describí la captura para accesibilidad',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'highlights',
      title: 'Datos destacados',
      type: 'array',
      description: 'Hasta 3 datos para la card destacada (ej: 12.000 / páginas indexadas).',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'value', title: 'Valor', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'label', title: 'Etiqueta', type: 'string', validation: (r) => r.required() }),
          ],
          preview: { select: { title: 'value', subtitle: 'label' } },
        }),
      ],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: 'order',
      title: 'Orden de aparición',
      type: 'number',
      description: 'Número más bajo = aparece primero',
      initialValue: 0,
    }),
    defineField({
      name: 'featured',
      title: 'Destacado',
      type: 'boolean',
      description: 'Se muestra como card ancha arriba de la grilla (uno solo).',
      initialValue: false,
    }),
  ],

  orderings: [
    {
      title: 'Orden manual',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
      media: 'mainImage',
    },
  },
});
