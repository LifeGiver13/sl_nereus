import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config/env';
import PlatformBadges, { PlatformInfo } from '../components/PlatformBadges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Smartphone, Search, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PageSizeSelector } from '../components/ui/page-size-selector';
import { usePreferences } from '../hooks/usePreferences';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
    id: string | number;
    username: string;
    email?: string;
    role?: string;
    status?: string;
    meta: {
        pushTokens?: PlatformInfo | null;
    }
    profile?: { [key: string]: any };
    [key: string]: any;
}

interface UsersResponse {
    results: UserRow[];
    total: number;
    page?: number;
    limit?: number;
}

type PlatformFilter = 'all' | 'ios' | 'android' | 'both';

type SortDirection = 'asc' | 'desc' | null;

const SortIcon = ({
    column,
    sortColumn,
    sortDirection,
}: {
    column: string;
    sortColumn: string | null;
    sortDirection: SortDirection;
}) => {
    if (sortColumn !== column)
        return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-gray-400 inline" />;
    if (sortDirection === 'asc')
        return <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />;
    return <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
};

const hasAnyPlatform = (u: UserRow) => {
    const hasIos = Array.isArray(u?.meta.pushTokens?.ios) && u?.meta.pushTokens.ios.length > 0;
    const hasAndroid = Array.isArray(u?.meta.pushTokens?.android) && u?.meta.pushTokens.android.length > 0;
    return hasIos || hasAndroid;
};

const AppPlatformUsers: React.FC = () => {
    const { token } = useAuth();
    const { toast } = useToast();
    const { preferences, updateTablePreferences } = usePreferences();

    const [allWithPlatform, setAllWithPlatform] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    const itemsPerPage = preferences.table.pageSize || 10;



    const handleSort = (column: string) => {
        if (sortColumn === column) {
            if (sortDirection === 'asc') setSortDirection('desc');
            else if (sortDirection === 'desc') {
                setSortColumn(null);
                setSortDirection(null);
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };
    // Fetch users and keep ONLY those with iOS or Android
    const fetchUsers = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const LIMIT = 1000;

            const fetchPage = async (page: number): Promise<UsersResponse> => {
                const offset = (page - 1) * LIMIT;

                const res = await fetch(
                    `${API_BASE_URL}/users?page=${page}&limit=${LIMIT}&offset=${offset}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "X-SERVICE-USER": token,
                        },
                    }
                );

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.message || `Failed to load users (${res.status})`);
                }

                return res.json();
            };

            // First page
            const first = await fetchPage(1);

            let allUsers: UserRow[] = [...(first.results || [])];

            const totalUsers = Number(first.total || allUsers.length);
            const totalPages = Math.max(1, Math.ceil(totalUsers / LIMIT));

            if (totalPages > 1) {
                const requests: Promise<UsersResponse>[] = [];

                for (let page = 2; page <= totalPages; page++) {
                    requests.push(fetchPage(page));
                }

                const remaining = await Promise.all(requests);

                remaining.forEach(r => {
                    if (Array.isArray(r.results)) {
                        allUsers.push(...r.results);
                    }
                });
            }

            const withPlatform = allUsers.filter(hasAnyPlatform);

            setAllWithPlatform(withPlatform);
            setCurrentPage(1);

        } catch (err: any) {
            console.error(err);

            setError(err.message || "Unable to fetch users");
            setAllWithPlatform([]);

            toast({
                title: "Error",
                description: err.message || "Failed to fetch users",
                variant: "destructive",
            });

        } finally {
            setLoading(false);
        }
    }, [token, toast]);


    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Apply iOS / Android / both filter on the already-filtered "has platform" list
    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        return allWithPlatform.filter((u) => {
            const hasIos =
                Array.isArray(u?.meta?.pushTokens?.ios) && u.meta?.pushTokens.ios.length > 0;
            const hasAndroid =
                Array.isArray(u?.meta?.pushTokens?.android) &&
                u.meta?.pushTokens.android.length > 0;

            // Platform filter
            if (platformFilter === 'ios' && !(hasIos && !hasAndroid)) return false;
            if (platformFilter === 'android' && !(hasAndroid && !hasIos)) return false;
            if (platformFilter === 'both' && !(hasIos && hasAndroid)) return false;

            // Text search (client-side)
            if (!q) return true;

            const name =
                u.profile?.fullName ||
                [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') ||
                '';

            const hay = [
                u.username,
                String(u.id),
                name,
                u.profile?.firstName,
                u.profile?.lastName,
                u.profile?.middleNames,
                u.profile?.MiddleNames,
                u.profile?.ForeName,
                u.profile?.Surename,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return hay.includes(q);
        });
    }, [allWithPlatform, platformFilter, searchTerm]);

    const sorted = useMemo(() => {
        let list = [...filtered];
        if (!sortColumn || !sortDirection) return list;

        const dir = sortDirection === 'asc' ? 1 : -1;

        return list.sort((a, b) => {
            switch (sortColumn) {
                case 'username':
                    return (a.username || '').localeCompare(b.username || '') * dir;
                case 'email':
                    return (a.email || '').localeCompare(b.email || '') * dir;
                case 'user': {
                    const aName =
                        a.profile?.fullName ||
                        [a.profile?.firstName, a.profile?.lastName].filter(Boolean).join(' ') ||
                        a.username ||
                        '';
                    const bName =
                        b.profile?.fullName ||
                        [b.profile?.firstName, b.profile?.lastName].filter(Boolean).join(' ') ||
                        b.username ||
                        '';
                    return aName.localeCompare(bName) * dir;
                }
                default:
                    return 0;
            }
        });
    }, [filtered, sortColumn, sortDirection]);


    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

    // Reset to page 1 when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [platformFilter, searchTerm, itemsPerPage]);

    // Slice for current page
    const pageRows = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sorted.slice(start, start + itemsPerPage);
    }, [sorted, currentPage, itemsPerPage]);

    const stats = useMemo(() => {
        let ios = 0;
        let android = 0;
        let both = 0;

        allWithPlatform.forEach((u) => {
            const hasIos = Array.isArray(u?.meta.pushTokens?.ios) && u?.meta.pushTokens.ios.length > 0;
            const hasAndroid = Array.isArray(u?.meta.pushTokens?.android) && u?.meta.pushTokens.android.length > 0;
            if (hasIos && hasAndroid) both += 1;
            else if (hasIos) ios += 1;
            else if (hasAndroid) android += 1;
        });

        return { ios, android, both, total: allWithPlatform.length };
    }, [allWithPlatform]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setPlatformFilter('all');
        setCurrentPage(1);
    };

    const renderPagination = () => {
        // Do not show pagination when there are no results or only one page
        if (total === 0 || totalPages <= 1) return null;

        const pages: React.ReactNode[] = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <PaginationItem key={i}>
                    <PaginationLink
                        href="#"
                        isActive={i === currentPage}
                        onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(i);
                        }}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                                }}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                        </PaginationItem>

                        {pages}

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                }}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        );
    };

    return (
        <div className="space-y-6">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#000009]">App Platforms</h1>
                    <p className="text-gray-600 mt-1">
                        Users who have the mobile app installed (iOS and/or Android)
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">With app</p>
                        <p className="text-2xl font-semibold">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">iOS only</p>
                        <p className="text-2xl font-semibold text-blue-600">{stats.ios}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Android only</p>
                        <p className="text-2xl font-semibold text-green-600">{stats.android}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground">Both</p>
                        <p className="text-2xl font-semibold text-purple-600">{stats.both}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <CardTitle className="text-[#000009] flex items-center gap-2">
                                <Smartphone className="h-5 w-5" />
                                Users with app installed
                            </CardTitle>
                            <CardDescription>
                                Only users that have at least one device token (iOS and/or Android).
                            </CardDescription>
                        </div>
                        <PageSizeSelector
                            pageSize={itemsPerPage}
                            onPageSizeChange={(size) => {
                                updateTablePreferences({ pageSize: size });
                                setCurrentPage(1);
                            }}
                            totalItems={total}
                        />
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search username, email"
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                            <label className="text-sm font-medium">Platform</label>
                            <Select
                                value={platformFilter}
                                onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Platform" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All (with app)</SelectItem>
                                    <SelectItem value="ios">iOS only</SelectItem>
                                    <SelectItem value="android">Android only</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button variant="outline" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    </div>

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Loading users…
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="cursor-pointer select-none"
                                                onClick={() => handleSort('user')}
                                            >
                                                Full Name
                                                <SortIcon column="user" sortColumn={sortColumn} sortDirection={sortDirection} />
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer select-none"
                                                onClick={() => handleSort('username')}
                                            >
                                                Email
                                                <SortIcon column="username" sortColumn={sortColumn} sortDirection={sortDirection} />
                                            </TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Platforms</TableHead>
                                            <TableHead className="text-right">Devices</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    No users with the app installed match the current filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            pageRows.map((u) => {
                                                const iosCount = Array.isArray(u?.meta.pushTokens?.ios) ? u?.meta.pushTokens.ios.length : 0;
                                                const androidCount = Array.isArray(u?.meta.pushTokens?.android)
                                                    ? u?.meta.pushTokens.android.length
                                                    : 0;

                                                const displayName =
                                                    u.profile?.fullName ||
                                                    [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') ||
                                                    u.username ||
                                                    '—';

                                                return (
                                                    <TableRow key={u.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span>{displayName}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {u.username}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {u.role ? (
                                                                <Badge variant="secondary" className="capitalize">
                                                                    {u.role}
                                                                </Badge>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <PlatformBadges platform={u?.meta.pushTokens} size="sm" />
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm text-muted-foreground">
                                                            {iosCount + androidCount > 0
                                                                ? `${iosCount + androidCount} device${iosCount + androidCount > 1 ? 's' : ''}`
                                                                : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination only when there is more than one page of users-with-platforms */}
                            {renderPagination()}

                            {!loading && total > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Showing {(currentPage - 1) * itemsPerPage + 1}
                                    {'–'}
                                    {Math.min(currentPage * itemsPerPage, total)} of {total} users with app
                                    installed
                                </p>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AppPlatformUsers;