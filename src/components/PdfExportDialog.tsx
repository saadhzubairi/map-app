import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { generateAllUSStatesPDF, generateUSStatePDF, generateAllInternationalPDF, generateInternationalCountryPDF } from '@/lib/pdfGeneratorClient'; // Assuming you have these functions

interface PdfExportDialogButtonProps {
    mode: 'us' | 'international';
    selected: string | null;
    usStates: string[];
    intlCountries: string[];
}

async function downloadFile(response: Response) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = 'download.pdf';
    if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
            fileName = fileNameMatch[1];
        }
    }
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

export default function PdfExportDialogButton({ mode, selected, usStates, intlCountries }: PdfExportDialogButtonProps) {
    const [open, setOpen] = useState(false);
    const [exportSelection, setExportSelection] = useState(selected || '');
    const [allLocations, setAllLocations] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: string, error?: string, details?: string } | null>(null);

    useEffect(() => {
        if (selected) {
            setExportSelection(selected);
        } else {
            setExportSelection('');
        }
    }, [selected]);

    const handleExport = async (exportType: 'specific' | 'modeAll' | 'all') => {
        setLoading(true);
        setResult(null);

        try {
            if (exportType === 'specific') {
                const selection = exportSelection;
                if (!selection) {
                    setResult({ error: 'No location selected.' });
                    return;
                }

                const endpoint = mode === 'us' ? '/api/export-us-state-pdf' : '/api/export-international-pdf';
                const body = mode === 'us' ? { state: selection } : { country: selection };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || `Failed to export ${selection}`);
                }
                
                await downloadFile(response);
                setResult({ success: `${selection} PDF generated and downloaded!` });

            } else if (exportType === 'modeAll') {
                // This part remains for client-side generation, which you might want to change later.
                if (mode === 'us') {
                     setResult({ error: 'Export for all US states not implemented yet.' });
                } else {
                    setResult({ error: 'Export for all international locations not implemented yet.' });
                }
            } else if (exportType === 'all') {
                setResult({ error: 'Exporting all locations (US + International) is not yet supported in this flow.' });
            }
        } catch (e: any) {
            setResult({ error: 'Failed to export.', details: e?.message || String(e) });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
      setOpen(false);
      setExportSelection('');
      setAllLocations(false);
      setResult(null);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                className="hover:cursor-pointer bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
                onClick={() => setOpen(true)}
                type="button"
            >
                Export as PDF
            </Button>
            <DialogContent showCloseButton className="bg-white w-[32rem] max-w-4xl text-gray-900">
                <DialogHeader>
                    <DialogTitle>Export Locations as PDF</DialogTitle>
                    <DialogDescription>
                        Select the location(s) you want to export.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="allLocations"
                            checked={allLocations}
                            onCheckedChange={setAllLocations}
                        />
                        <Label htmlFor="allLocations">Export all {mode === 'us' ? 'US' : 'International'} locations</Label>
                    </div>

                    {!allLocations && (
                        <Select value={exportSelection} onValueChange={setExportSelection}>
                            <SelectTrigger>
                                <SelectValue placeholder={`Select a ${mode === 'us' ? 'state' : 'country'}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {(mode === 'us' ? usStates : intlCountries).map(item => (
                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <DialogFooter className='sm:justify-start'>
                    <Button
                        type="button"
                        onClick={() => handleExport(allLocations ? 'modeAll' : 'specific')}
                        disabled={loading || (!allLocations && !exportSelection)}
                    >
                        {loading ? 'Exporting...' : 'Export'}
                    </Button>
                    {mode === 'us' && (
                         <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleExport('all')}
                            disabled={loading}
                        >
                            Export All Locations
                        </Button>
                    )}
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>

                {result && (
                    <div className={`mt-4 p-4 rounded-md text-sm ${result.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {result.success && <p>{result.success}</p>}
                        {result.error && (
                            <>
                                <p className="font-bold">{result.error}</p>
                                {result.details && <p className="mt-1 text-xs">{result.details}</p>}
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
} 