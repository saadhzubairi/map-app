/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';

interface ValidationResult {
  file: string;
  type: string;
  exists: boolean;
  valid: boolean;
  errors: string[];
}

export default function JsonValidationClient() {
  const [results, setResults] = useState<ValidationResult[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/validate-jsons');
      if (!res.ok) throw new Error('Failed to fetch validation results');
      const data = await res.json();
      setResults(data.results);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
    console.log('Results:', results);
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return (
    <div className="flex flex-col items-center mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">JSON Validation Results</h1>
      <button
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={fetchResults}
        disabled={loading}
      >
        {loading ? 'Checking...' : 'Re-run Validation'}
      </button>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <table className="w-[80%] border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">File</th>
            <th className="border px-2 py-1">Type</th>
            <th className="border px-2 py-1">Exists</th>
            <th className="border px-2 py-1">Valid</th>
            <th className="border px-2 py-1">Errors</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.file} className={r.valid ? '' : 'bg-red-50'}>
              <td className={cn("border px-2 py-1 font-mono",r.valid?'bg-green-200':'')}>{r.file}</td>
              <td className={cn("border px-2 py-1",r.valid?'bg-green-200':'')}>{r.type}</td>
              <td className={cn("border px-2 py-1 text-center",r.valid?'bg-green-200':'')}>{r.exists ? '✅' : '❌'}</td>
              <td className={cn("border px-2 py-1 text-center",r.valid?'bg-green-200':'')}>{r.valid ? '✅' : '❌'}</td>
              <td className={cn("border px-2 py-1 text-red-700",r.valid?'bg-green-200':'')}>
                {r.errors.length > 0 ? (
                  <ul className="list-disc ml-4">
                    {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        
      </table>
      {!results && <div>No results</div>}
    </div>
  );
} 