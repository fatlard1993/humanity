import { GET } from '@vanilla-bean/components';

export const getPacks = async options => await GET('/packs', { apiId: 'packs', ...options });

export const getRandomName = async options => await GET('/packs/random-name', { cache: false, ...options });
