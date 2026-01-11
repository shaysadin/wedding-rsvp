"use client";

import { useState, useMemo } from "react";
import { Search, Users, TableProperties, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Guest {
  id: string;
  name: string;
  guestCount: number;
  tableName: string | null;
  tableId: string | null;
}

interface HostessGuestTableProps {
  guests: Guest[];
  locale: string;
}

type SortField = "name" | "guestCount" | "tableName";
type SortDirection = "asc" | "desc";

export function HostessGuestTable({ guests, locale }: HostessGuestTableProps) {
  const isRTL = locale === "he";
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("tableName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Translations
  const t = {
    searchPlaceholder: isRTL ? "חפש אורח או שולחן..." : "Search guest or table...",
    name: isRTL ? "שם האורח" : "Guest Name",
    guestCount: isRTL ? "מספר אורחים" : "Guest Count",
    table: isRTL ? "שולחן" : "Table",
    noTable: isRTL ? "לא משובץ" : "Not assigned",
    noResults: isRTL ? "לא נמצאו תוצאות" : "No results found",
    totalGuests: isRTL ? "סה\"כ אורחים" : "Total Guests",
    totalParties: isRTL ? "סה\"כ הזמנות" : "Total Parties",
    tablesUsed: isRTL ? "שולחנות בשימוש" : "Tables Used",
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalGuests = guests.reduce((sum, g) => sum + g.guestCount, 0);
    const uniqueTables = new Set(guests.filter(g => g.tableName).map(g => g.tableName));
    return {
      totalGuests,
      totalParties: guests.length,
      tablesUsed: uniqueTables.size,
    };
  }, [guests]);

  // Filter and sort guests
  const filteredAndSortedGuests = useMemo(() => {
    let result = guests;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (guest) =>
          guest.name.toLowerCase().includes(query) ||
          (guest.tableName && guest.tableName.toLowerCase().includes(query))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name, locale);
          break;
        case "guestCount":
          comparison = a.guestCount - b.guestCount;
          break;
        case "tableName":
          // Put unassigned guests at the end
          if (!a.tableName && !b.tableName) comparison = 0;
          else if (!a.tableName) comparison = 1;
          else if (!b.tableName) comparison = -1;
          else comparison = a.tableName.localeCompare(b.tableName, locale, { numeric: true });
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [guests, searchQuery, sortField, sortDirection, locale]);

  // Group guests by table for visual separation
  const guestsByTable = useMemo(() => {
    const grouped = new Map<string | null, Guest[]>();

    filteredAndSortedGuests.forEach((guest) => {
      const key = guest.tableName;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(guest);
    });

    return grouped;
  }, [filteredAndSortedGuests]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ms-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ms-1" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.totalGuests}</p>
                <p className="text-2xl font-bold">{stats.totalGuests}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.totalParties}</p>
                <p className="text-2xl font-bold">{stats.totalParties}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.tablesUsed}</p>
                <p className="text-2xl font-bold">{stats.tablesUsed}</p>
              </div>
              <TableProperties className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Guest Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("name")}
                  >
                    {t.name}
                    <SortIcon field="name" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("guestCount")}
                  >
                    {t.guestCount}
                    <SortIcon field="guestCount" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("tableName")}
                  >
                    {t.table}
                    <SortIcon field="tableName" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedGuests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {t.noResults}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedGuests.map((guest, index) => {
                  // Add visual separator between tables
                  const prevGuest = filteredAndSortedGuests[index - 1];
                  const isNewTable = index === 0 || guest.tableName !== prevGuest?.tableName;

                  return (
                    <TableRow
                      key={guest.id}
                      className={cn(
                        isNewTable && index !== 0 && "border-t-4"
                      )}
                    >
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {guest.guestCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {guest.tableName ? (
                          <Badge variant="outline" className="font-normal">
                            {guest.tableName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t.noTable}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
