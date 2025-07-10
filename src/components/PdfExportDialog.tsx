import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

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
    const [richMap, setRichMap] = useState(true); // New toggle for rich map
    const [priceIncluded, setPriceIncluded] = useState(true); // New toggle for price included (not implemented)
    const [progressMessage, setProgressMessage] = useState('');

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
        setProgressMessage('');

        try {
            if (exportType === 'specific') {
                const selection = exportSelection;
                if (!selection) {
                    setResult({ error: 'No location selected.' });
                    return;
                }

                setProgressMessage(`Generating PDF for ${selection}... This may take a few minutes for states with many locations.`);

                const endpoint = mode === 'us' ? '/api/export-us-state-pdf' : '/api/export-international-pdf';
                const body = {
                  ...(mode === 'us' ? { state: selection } : { country: selection }),
                  richMap, // Pass the richMap flag
                  priceIncluded, // Pass the priceIncluded flag
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    if (response.status === 408) {
                        // Timeout error
                        throw new Error(`PDF generation timed out for ${selection}. This can happen for locations with many addresses. Please try again or disable the "Rich map" option for faster generation.`);
                    }
                    throw new Error(errorData.details || `Failed to export ${selection}`);
                }
                
                setProgressMessage('Downloading PDF...');
                await downloadFile(response);
                setResult({ success: `${selection} PDF generated and downloaded successfully!` });

            } else if (exportType === 'modeAll') {
                if (mode === 'us') {
                    setResult({ error: 'Export for all US states not implemented yet.' });
                } else {
                    // Implement export all international locations
                    setProgressMessage('Generating PDF for all international locations... This may take 5-10 minutes.');
                    
                    const endpoint = '/api/export-all-international-pdf';
                    const body = { richMap, priceIncluded };
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        if (response.status === 408) {
                            // Timeout error
                            throw new Error('PDF generation timed out for all international locations. This can happen when processing many countries. Please try again or disable the "Rich map" option for faster generation.');
                        }
                        throw new Error(errorData.details || 'Failed to export all international locations');
                    }
                    
                    setProgressMessage('Downloading PDF...');
                    await downloadFile(response);
                    setResult({ success: 'All international locations PDF generated and downloaded successfully!' });
                }
            } else if (exportType === 'all') {
                setResult({ error: 'Exporting all locations (US + International) is not yet supported in this flow.' });
            }
        } catch (e: unknown) {
            const message = typeof e === 'object' && e && 'message' in e ? (e as { message: string }).message : String(e);
            setResult({ error: 'Failed to export.', details: message });
        } finally {
            setLoading(false);
            setProgressMessage('');
        }
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
                            disabled={true}
                        />
                        <Label htmlFor="allLocations">Export all {mode === 'us' ? 'US' : 'International'} locations (coming soon)</Label>
                    </div>

                    {/* Rich Map Toggle */}
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="richMap"
                            checked={richMap}
                            onCheckedChange={setRichMap}
                        />
                        <Label htmlFor="richMap">Rich map (OpenMaps)</Label>
                    </div>

                    {/* Price Included Toggle (not implemented) */}
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="priceIncluded"
                            checked={priceIncluded}
                            onCheckedChange={setPriceIncluded}
                        />
                        <Label htmlFor="priceIncluded">Price included</Label>
                    </div>

                    {!allLocations && (
                        <Select value={exportSelection} onValueChange={setExportSelection}>
                            <SelectTrigger>
                                <SelectValue placeholder={`Select a ${mode === 'us' ? 'state' : 'country'}`} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
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
                        className="hover:cursor-pointer bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
                    >
                        {loading ? 'Exporting...' : 'Export'}
                    </Button>
                    {/* {mode === 'us' && (
                         <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleExport('all')}
                            disabled={loading}
                        >
                            Export All Locations
                        </Button>
                    )} */}
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>

                {progressMessage && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-blue-800">{progressMessage}</p>
                        </div>
                    </div>
                )}

                {result && (
                    <div className={`mt-4 p-4 rounded-md text-sm ${result.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {result.success && <p>{result.success}</p>}
                        {result.error && (
                            <>
                                <p className="font-bold">{result.error}</p>
                                {result.details && <p className="mt-1 text-xs">{result.details}</p>}
                            </>
                        )}
                        {progressMessage && <p className="mt-2 text-sm text-gray-700">{progressMessage}</p>}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
} 