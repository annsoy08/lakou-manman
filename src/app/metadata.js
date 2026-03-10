import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const t = await getTranslations('site');
  
  return {
    title: t('title'),
    description: t('description'),
  };
}
