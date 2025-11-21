import React from "react";
import {
  File,
  Folder,
  ChevronRight,
  Download,
  Trash2,
  MoreVertical,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { FileItem } from "@/hooks/useFileExplorer";

interface FileListProps {
  items: any[]; // Using any[] for now as items can be FileItem or folder objects
  selectedFile: FileItem | null;
  currentLocation: string;
  setSelectedFile: (file: FileItem | null) => void;
  navigateTo: (path: string[]) => void;
  handleDownload: (file: FileItem) => void;
  handleDeleteFile: (file: FileItem) => void;
}

export default function FileList({
  items,
  selectedFile,
  currentLocation,
  setSelectedFile,
  navigateTo,
  handleDownload,
  handleDeleteFile,
}: FileListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    else return (bytes / 1073741824).toFixed(1) + " GB";
  };

  return (
    <div className="flex flex-1 gap-4 overflow-hidden">
      <div className="w-full flex-1 overflow-hidden">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            {/* Desktop column headers */}
            {currentLocation != "root" &&
              currentLocation != "Tasks" &&
              currentLocation != "Task Folder" && (
                <div className="border-b p-4 pt-0 hidden sm:block">
                  <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground">
                    <div className="col-span-6">Name</div>
                    <div className="col-span-2">Size</div>
                    <div className="col-span-3">Date Added</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>
              )}
            <ScrollArea className="h-[calc(100vh-350px)]">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <File className="h-12 w-12 mb-4 opacity-20" />
                  <p>No files in this folder</p>
                </div>
              ) : (
                <div>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`border-b hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors ${
                        selectedFile?.id === item.id
                          ? "bg-slate-100 dark:bg-slate-800/60"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === "file") {
                          setSelectedFile(item as FileItem);
                        }
                      }}
                    >
                      {/* Desktop View */}
                      <div className="hidden sm:grid grid-cols-12 items-center px-4 py-3 text-sm">
                        <div className="col-span-6 flex items-center truncate">
                          {item.type === "folder" ? (
                            <div
                              className="flex items-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if ("navigateTo" in item && item.navigateTo) {
                                  navigateTo(item.navigateTo);
                                }
                              }}
                            >
                              <Folder className="h-5 w-5 mr-2 text-blue-500" />
                              <span className="mr-2 min-w-16 w-auto">
                                {item.name}
                              </span>

                              {"count" in item && (
                                <Badge
                                  variant="outline"
                                  className="text-xs w-16 mr-2 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                >
                                  {item.count} file
                                  {item.count !== 1 ? "s" : ""}
                                </Badge>
                              )}

                              {"hasMain" in item &&
                                "hasDeliverables" in item && (
                                  <div className="flex">
                                    {item.hasDeliverables && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                      >
                                        {item.deliverablesCount} deliverable
                                        {item.deliverablesCount !== 1
                                          ? "s"
                                          : ""}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="flex items-center cursor-pointer">
                              <File className="h-5 w-5" />
                              <span className="ml-2 truncate">{item.name}</span>

                              {(item as FileItem).isTaskDeliverable && (
                                <Badge className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Deliverable
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          {item.type === "file"
                            ? formatFileSize((item as FileItem).size)
                            : ""}
                        </div>

                        <div className="col-span-3">
                          {item.type === "file"
                            ? formatDate((item as FileItem).createdAt)
                            : ""}
                        </div>

                        <div className="col-span-1 flex justify-start">
                          {item.type === "file" && (
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(item as FileItem);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500/70 hover:text-red-600/70 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(item as FileItem);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mobile View */}
                      <div className="sm:hidden px-4 py-3">
                        {item.type === "folder" ? (
                          <div
                            className="flex items-center cursor-pointer justify-between"
                            onClick={(e) => {
                              e.stopPropagation();
                              if ("navigateTo" in item && item.navigateTo) {
                                navigateTo(item.navigateTo);
                              }
                            }}
                          >
                            <div className="flex">
                              <Folder className="h-5 w-5 mr-2 text-blue-500" />
                              <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>

                                <div className="flex mt-1 gap-2">
                                  {"count" in item && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                    >
                                      {item.count} file
                                      {item.count !== 1 ? "s" : ""}
                                    </Badge>
                                  )}

                                  {"hasMain" in item &&
                                    "hasDeliverables" in item &&
                                    item.hasDeliverables && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                      >
                                        {item.deliverablesCount} deliverable
                                        {item.deliverablesCount !== 1
                                          ? "s"
                                          : ""}
                                      </Badge>
                                    )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <File className="h-5 w-5 mr-2" />
                                <span className="font-medium truncate mr-2">
                                  {item.name}
                                </span>

                                {(item as FileItem).isTaskDeliverable && (
                                  <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Deliverable
                                  </Badge>
                                )}
                              </div>
                              <div className="ml-7 text-xs text-muted-foreground mt-1">
                                {formatFileSize((item as FileItem).size)}
                              </div>
                            </div>

                            {item.type === "file" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(item as FileItem);
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500 focus:text-red-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFile(item as FileItem);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
