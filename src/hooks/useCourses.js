import { useState, useEffect, useCallback } from 'react';
import { coursesService } from '../lib/coursesService';
import { dataStoreService } from '../lib/dataStoreService';
import { handleServiceError } from '../lib/errorHandler';

// ALFA_NORMALIZATION: Blindaje contra nombres de columnas inconsistentes
export const normalizeCourse = (item) => {
  if (!item) return null;
  const id = item.id;
  const name = item.name || item.nombre || item.title || 'Materia Sin Nombre';
  const color = item.color || item.prefix_color || item.prefixColor || '#ff0000';
  const teacher = item.teacher || item.profesor || item.instructor || 'Sin Profesor';
  const code = item.code || item.codigo || 'S/C';
  const institution = item.institution || item.institucion || 'Sin Institución';

  return { id, name, color, teacher, code, institution };
};

export const useCourses = (userId) => {
  // "La mesa en la entrada": Carga síncrona inmediata desde la memoria / local storage
  const [courses, setCourses] = useState(() => {
    const cached = dataStoreService.getCachedData('courses', userId);
    return Array.isArray(cached) ? cached.map(normalizeCourse).filter(Boolean) : [];
  });

  const [loading, setLoading] = useState(() => {
    const hasCache = dataStoreService.hasCachedData('courses', userId);
    return !hasCache && Boolean(userId);
  });

  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(() => {
    return dataStoreService.getCacheEntry('courses', userId)?.lastFetched || 0;
  });

  // Suscripción reactiva para revalidaciones silenciosas en segundo plano (SWR)
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = dataStoreService.subscribe('courses', userId, (freshCourses) => {
      if (Array.isArray(freshCourses)) {
        setCourses(freshCourses.map(normalizeCourse).filter(Boolean));
        setLastFetched(Date.now());
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [userId]);

  const fetchCourses = useCallback(async (options = {}) => {
    if (!userId) {
      setCourses([]);
      return;
    }
    const hasCache = dataStoreService.hasCachedData('courses', userId);
    if (!hasCache && !options.silent) {
      setLoading(true);
    }
    try {
      const data = await dataStoreService.getCourses(userId, options);
      const normalizedData = (data || []).map(normalizeCourse).filter(Boolean);
      setCourses(normalizedData);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { showToast: false, context: 'useCourses.fetchCourses' });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const addCourse = useCallback(async (course) => {
    try {
      const newCourse = await coursesService.createCourse(userId, course);
      const normalized = normalizeCourse(newCourse);
      setCourses(prev => [normalized, ...prev.filter(c => String(c.id) !== String(normalized.id))]);
      dataStoreService.addCachedItem('courses', userId, normalized);
      setLastFetched(Date.now());
      return normalized;
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al registrar la materia', context: 'useCourses.addCourse' });
      throw err;
    }
  }, [userId]);

  const updateCourse = useCallback(async (id, updates) => {
    // Optimistic update
    setCourses(prev => prev.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c));
    dataStoreService.updateCachedItem('courses', userId, id, c => ({ ...c, ...updates }));
    setLastFetched(Date.now());

    try {
      const updatedCourse = await coursesService.updateCourse(id, updates, userId);
      const normalized = normalizeCourse(updatedCourse);
      setCourses(prev => prev.map(c => String(c.id) === String(id) ? normalized : c));
      dataStoreService.updateCachedItem('courses', userId, id, () => normalized);
      setLastFetched(Date.now());
      return normalized;
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al actualizar la materia', context: 'useCourses.updateCourse' });
      fetchCourses({ forceRefresh: true });
      throw err;
    }
  }, [userId, fetchCourses]);

  const deleteCourse = useCallback(async (id) => {
    // Optimistic update
    setCourses(prev => prev.filter(c => String(c.id) !== String(id)));
    dataStoreService.removeCachedItem('courses', userId, id);
    setLastFetched(Date.now());

    try {
      await coursesService.deleteCourse(id, userId);
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al eliminar la materia', context: 'useCourses.deleteCourse' });
      fetchCourses({ forceRefresh: true });
      throw err;
    }
  }, [userId, fetchCourses]);

  return {
    courses,
    setCourses,
    loading,
    coursesLoading: loading,
    lastFetched,
    isInitialized: Boolean(lastFetched > 0 || courses.length > 0),
    error,
    addCourse,
    updateCourse,
    deleteCourse,
    refreshCourses: fetchCourses
  };
};
