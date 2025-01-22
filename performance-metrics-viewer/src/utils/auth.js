export const getBasicAuth = () => {
  const credentials = btoa(`admin:password123`);
  return `Basic ${credentials}`;
};

export const getBasicAuthHeaders = () => {
  return {
    Authorization: getBasicAuth(),
    'Content-Type': 'application/json',
  };
}