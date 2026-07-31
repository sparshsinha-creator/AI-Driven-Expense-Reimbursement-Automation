import employeesData from "../data/employees.json";

/**
 * Real employee roster (data/employee_roster.csv), converted once into
 * src/data/employees.json. Not mock data.
 */
export function useEmployees() {
  return employeesData;
}
