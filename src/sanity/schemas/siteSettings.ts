import { defineType, defineField, defineArrayMember } from 'sanity';
import { CogIcon } from '@sanity/icons';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Configuración del Sitio',
  type: 'document',
  icon: CogIcon,
  fields: [
    // ─── SEO ───
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        defineField({
          name: 'title',
          title: 'Título del sitio',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'description',
          title: 'Descripción del sitio',
          type: 'text',
          rows: 3,
          validation: (rule) =>
            rule.max(160).warning('Mantené la descripción por debajo de 160 caracteres para SEO'),
        }),
      ],
    }),

    // ─── HERO ───
    defineField({
      name: 'hero',
      title: 'Hero (Sección principal)',
      type: 'object',
      fields: [
        defineField({
          name: 'greeting',
          title: 'Saludo',
          type: 'string',
          description: 'Ej: "¡Hola! Soy Lucas,"',
        }),
        defineField({
          name: 'title',
          title: 'Título principal',
          type: 'string',
          description: 'Ej: "Frontend Developer"',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'subtitle',
          title: 'Subtítulo',
          type: 'string',
          description: 'Ej: "especializado en UI/UX."',
        }),
        defineField({
          name: 'lead',
          title: 'Bajada',
          type: 'text',
          rows: 3,
        }),
        defineField({
          name: 'ctaLabel',
          title: 'Texto del botón principal',
          type: 'string',
          description: 'Ej: "Ver proyectos"',
        }),
        defineField({
          name: 'secondaryLabel',
          title: 'Texto del botón secundario',
          type: 'string',
          description: 'Ej: "Mandame un mensaje" (lleva a Contacto)',
        }),
      ],
    }),

    // ─── SOBRE MÍ ───
    defineField({
      name: 'about',
      title: 'Sobre mí',
      type: 'object',
      fields: [
        defineField({ name: 'title', title: 'Título', type: 'string', description: 'Ej: "Sobre mí"' }),
        defineField({ name: 'text', title: 'Texto', type: 'text', rows: 5 }),
        defineField({
          name: 'now',
          title: 'Ahora mismo',
          type: 'array',
          description: 'Lista corta de qué estás haciendo hoy (estudio, trabajo, aprendiendo). Vacío: queda solo "5to año de Licenciatura en Sistemas, UNTDF".',
          of: [defineArrayMember({ type: 'string' })],
        }),
        defineField({ name: 'cvUrl', title: 'Link al CV (PDF)', type: 'url', description: 'Si queda vacío se usa /cv.pdf (archivo en la carpeta public).', validation: (rule) => rule.uri({ allowRelative: true }) }),
        defineField({ name: 'cvLabel', title: 'Texto del botón de CV', type: 'string', description: 'Ej: "Descargar CV"' }),
      ],
    }),

    // ─── CONTACTO ───
    defineField({
      name: 'contact',
      title: 'Sección de Contacto',
      type: 'object',
      fields: [
        defineField({
          name: 'tagline',
          title: 'Etiqueta superior',
          type: 'string',
          description: 'Ej: "Hagamos equipo"',
        }),
        defineField({
          name: 'description',
          title: 'Descripción',
          type: 'text',
          rows: 3,
        }),
        defineField({
          name: 'email',
          title: 'Email de contacto',
          type: 'string',
          validation: (rule) => rule.email(),
        }),
        defineField({
          name: 'ctaLabel',
          title: 'Texto del botón',
          type: 'string',
          description: 'Ej: "HABLEMOS"',
        }),
      ],
    }),

    // ─── FOOTER ───
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'object',
      fields: [
        defineField({
          name: 'copyright',
          title: 'Texto de copyright',
          type: 'string',
          description: 'Sin el símbolo © ni el año (se agregan automáticamente)',
        }),
        defineField({
          name: 'navLinks',
          title: 'Links de navegación',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'label', title: 'Texto', type: 'string', validation: (r) => r.required() }),
                defineField({ name: 'href', title: 'Enlace (ancla)', type: 'string', validation: (r) => r.required() }),
              ],
              preview: {
                select: { title: 'label', subtitle: 'href' },
              },
            }),
          ],
        }),
      ],
    }),

    // ─── REDES SOCIALES ───
    defineField({
      name: 'socialLinks',
      title: 'Redes Sociales',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'platform',
              title: 'Plataforma',
              type: 'string',
              options: {
                list: [
                  { title: 'LinkedIn', value: 'linkedin' },
                  { title: 'GitHub', value: 'github' },
                  { title: 'Instagram', value: 'instagram' },
                  { title: 'Gmail', value: 'gmail' },
                  { title: 'Twitter / X', value: 'twitter' },
                ],
              },
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (rule) =>
                rule.uri({ scheme: ['http', 'https', 'mailto'] }),
            }),
          ],
          preview: {
            select: { title: 'platform', subtitle: 'url' },
          },
        }),
      ],
    }),
  ],

  preview: {
    prepare() {
      return { title: 'Configuración del Sitio' };
    },
  },
});
