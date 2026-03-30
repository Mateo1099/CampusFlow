import { useState, useEffect, useCallback } from 'react';
import { coursesService } from '../lib/coursesService';

export const useCourses = (userId) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async () => {
    if (!userId) {
      setCourses([]);
      return;
    }
    setLoading(true);
    try {
      const data = await coursesService.getCourses(userId);
      
      // ALFA_NORMALIZATION: Blindaje contra nombres de columnas inconsistentes
      const normalizedData = data.map(item => {
        // Buscamos variantes comunes de nombres de columnas
        const id = item.id;
        const name = item.name || item.nombre || item.title || 'Materia Sin Nombre';
        const color = item.color || item.prefix_color || item.prefixColor || '#ff0000';
        const teacher = item.teacher || item.profesor || item.instructor || 'Sin Profesor';
        const code = item.code || item.codigo || 'S/C';
        const institution = item.institution || item.institucion || 'Sin Institución';

        return { id, name, color, teacher, code, institution };
      });

      console.log("ALFA_PROOF_OF_LIFE: Materias cargadas y normalizadas ->", normalizedData);
      setCourses(normalizedData);
    } catch (err) {
      console.error("HOOK_COURSES_FATAL_ERROR:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const addCourse = async (course) => {
    try {
      const newCourse = await coursesService.createCourse(userId, course);
      // Aplicar misma normalización al insertar
      const normalized = {
        id: newCourse.id,
        name: newCourse.name || newCourse.nombre || course.name,
        color: newCourse.color || newCourse.prefix_color || course.color || '#ff0000',
        teacher: newCourse.teacher || course.teacher,
        code: newCourse.code || course.code,
        institution: newCourse.institution || course.institution
      };
      setCourses(prev => [normalized, ...prev]);
      return normalized;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateCourse = async (id, updates) => {
    try {
      const updatedCourse = await coursesService.updateCourse(id, updates);
      setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updatedCourse } : c));
      return updatedCourse;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteCourse = async (id) => {
    try {
      await coursesService.deleteCourse(id);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    courses,
    loading,
    error,
    addCourse,
    updateCourse,
    deleteCourse,
    refreshCourses: fetchCourses
  };
};
