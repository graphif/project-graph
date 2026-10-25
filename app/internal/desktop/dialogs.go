package desktop

import (
	"context"

	"github.com/egoist/mygo"
)

type FileFilter struct {
	Name       string   `json:"name"`
	Extensions []string `json:"extensions"`
}

type FileDialogOptions struct {
	Title       string       `json:"title"`
	DefaultPath string       `json:"defaultPath"`
	Directory   bool         `json:"directory"`
	Multiple    bool         `json:"multiple"`
	Filters     []FileFilter `json:"filters"`
}

func nativeFilters(filters []FileFilter) []mygo.FileFilter {
	result := make([]mygo.FileFilter, len(filters))
	for i, filter := range filters {
		result[i] = mygo.FileFilter{Name: filter.Name, Extensions: filter.Extensions}
	}
	return result
}

type Dialogs struct{}

func (Dialogs) Open(ctx context.Context, options FileDialogOptions) ([]string, error) {
	return mygo.Dialog.Open(mygo.OpenDialogOptions{
		Parent: mygo.CallerWindow(ctx), Title: options.Title, DefaultPath: options.DefaultPath,
		Directory: options.Directory, Multiple: options.Multiple, Filters: nativeFilters(options.Filters),
	})
}

func (Dialogs) Save(ctx context.Context, options FileDialogOptions) (string, error) {
	return mygo.Dialog.Save(mygo.SaveDialogOptions{
		Parent: mygo.CallerWindow(ctx), Title: options.Title,
		DefaultPath: options.DefaultPath, Filters: nativeFilters(options.Filters),
	})
}
