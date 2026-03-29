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
      setCourses(data);
    } catch (err) {
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
      const newCourse = await coursesService.createCourse(userId, {
        ...course,
        created_at: new Date().toISOString()
      });
      setCourses(prev => [newCourse, ...prev]);
      return newCourse;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateCourse = async (id, updates) => {
    try {
      const updatedCourse = await coursesService.updateCourse(id, updates);
      setCourses(prev => prev.map(c => c.id === id ? updatedCourse : c));
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
